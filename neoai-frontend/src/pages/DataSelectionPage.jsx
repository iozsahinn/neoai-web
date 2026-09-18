import { useEffect, useMemo, useRef, useState } from "react";
import { RegionVideosSidebar } from "../components/RegionVideosSidebar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { ViewerHeader } from "../components/ViewerHeader";
import { ViewerStage } from "../components/ViewerStage";
import { useFramePlayback } from "../hooks/useFramePlayback";
import { useFrameScrubber } from "../hooks/useFrameScrubber";
import { useSelectionSession } from "../hooks/useSelectionSession";
import { useViewerHold } from "../hooks/useViewerHold";
import { useVideoFrameExtraction } from "../hooks/useVideoFrameExtraction";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getExaminationByIds } from "../services/mockApi";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";
import { resetWorkflowAfterStep, setActiveWorkflowContext, getActiveWorkflowContext } from "../utils/workflowState";
import { parseAiBboxLines } from "../utils/imageOverlayUtils";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const DEFAULT_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const MAX_MAGNIFIER_CONFIG = { size: 500, zoomFactor: 8 };
const MIN_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };

// --- DYNAMIC RECTANGLE GENERATOR (AI FORMAT: classId x1 y1 x2 y2 normalized [0.0, 1.0]) ---
function generateRectanglesForFrame(frameNo, region) {
  const numRects = (frameNo % 3) + 1; // 1, 2, or 3 detections
  const rawLines = [];

  for (let i = 0; i < numRects; i++) {
    const classId = (i + frameNo) % 4; // 0, 1, 2, 3
    const x1 = Math.min(0.82, 0.15 + ((frameNo * 7 + i * 26) % 60) / 100);
    const y1 = Math.min(0.72, 0.18 + (i * 20) / 100);
    const x2 = Math.min(0.96, x1 + 0.16 + ((frameNo + i) % 6) / 100);
    const y2 = Math.min(0.92, y1 + 0.32 + ((frameNo * 2) % 12) / 100);

    rawLines.push(`${classId} ${x1.toFixed(6)} ${y1.toFixed(6)} ${x2.toFixed(6)} ${y2.toFixed(6)}`);
  }

  return parseAiBboxLines(rawLines);
}
// --- END ---

function getExaminationCacheKey(patientId, examinationId) {
  return `neoai-cache:${patientId}:${examinationId}`;
}

function getCommittedSelectionStateCacheKey(patientId, examinationId) {
  return `neoai-selection-committed:${patientId}:${examinationId}`;
}

function normalizeRotation(nextRotation) {
  const normalized = nextRotation % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getMagnifierState(stageRect, imageRect, clientX, clientY, magnifierConfig) {
  const lensSize = magnifierConfig.size;
  const zoomFactor = magnifierConfig.zoomFactor;
  const clampedX = Math.min(Math.max(clientX, imageRect.left), imageRect.right);
  const clampedY = Math.min(Math.max(clientY, imageRect.top), imageRect.bottom);
  const localX = clampedX - imageRect.left;
  const localY = clampedY - imageRect.top;

  return {
    x: clampedX - stageRect.left,
    y: clampedY - stageRect.top,
    backgroundWidth: imageRect.width * zoomFactor,
    backgroundHeight: imageRect.height * zoomFactor,
    backgroundOffsetX: -(localX * zoomFactor) + lensSize / 2,
    backgroundOffsetY: -(localY * zoomFactor) + lensSize / 2
  };
}

export function DataSelectionPage() {
  const { patientId, examinationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const initialRegion = examination?.videos[0]?.region || "r1";
  const examinationCacheKey = getExaminationCacheKey(patientId, examinationId);
  const committedSelectionStateCacheKey = getCommittedSelectionStateCacheKey(patientId, examinationId);

  const selectedModuleIds = useMemo(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }
    const context = getActiveWorkflowContext();
    if (Array.isArray(context?.selectedModuleIds) && context.selectedModuleIds.length > 0) {
      return context.selectedModuleIds;
    }
    try {
      const savedState = window.sessionStorage.getItem(`neoai-ai-module-committed:${patientId}:${examinationId}`);
      if (savedState) {
        const parsed = JSON.parse(savedState);
        if (Array.isArray(parsed?.selectedModuleIds) && parsed.selectedModuleIds.length > 0) {
          return parsed.selectedModuleIds;
        }
      }
    } catch {
      return ["rds-score", "b-line"];
    }
    return ["rds-score", "b-line"];
  }, [location.state, patientId, examinationId]);
  const isBLineSelected = selectedModuleIds.includes("b-line");
  const isRdsSelected = selectedModuleIds.includes("rds-score");
  const fpsPopoverRef = useRef(null);
  const magnifierPopoverRef = useRef(null);
  const pendingFrameJumpRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const [viewerMode, setViewerMode] = useState("video");
  const [selectedFrameRegion, setSelectedFrameRegion] = useState("");
  const [showFpsPopover, setShowFpsPopover] = useState(false);
  const [disabledActionMessage, setDisabledActionMessage] = useState("");
  const [showVideoMenu, setShowVideoMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [isMagnifierMode, setIsMagnifierMode] = useState(false);
  const [showMagnifierPopover, setShowMagnifierPopover] = useState(false);
  const [magnifierConfig, setMagnifierConfig] = useState(DEFAULT_MAGNIFIER_CONFIG);
  const [magnifierState, setMagnifierState] = useState({
    x: 0,
    y: 0,
    backgroundWidth: 0,
    backgroundHeight: 0,
    backgroundOffsetX: 0,
    backgroundOffsetY: 0
  });
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [viewRotation, setViewRotation] = useState(0);
  const [committedSelectionSignature, setCommittedSelectionSignature] = useState(() => {
    try {
      const savedCommittedState = window.sessionStorage.getItem(committedSelectionStateCacheKey);

      if (!savedCommittedState) {
        return null;
      }

      const parsedCommittedState = JSON.parse(savedCommittedState);

      if (parsedCommittedState?.selectedFrames && typeof parsedCommittedState.selectedFrames === "object") {
        return JSON.stringify(parsedCommittedState.selectedFrames);
      }
    } catch {
      return null;
    }

    return null;
  });
  const { activeRegion, setActiveRegion, lastViewedFrames, setLastViewedFrames, selectedFrames, setSelectedFrames } = useSelectionSession({
    patientId,
    examinationId,
    initialRegion
  });
  const { videoFramesByName, videoInfoByName, extractionStateByName } = useVideoFrameExtraction({
    examination,
    activeRegion,
    examinationCacheKey
  });

  const activeVideo = useMemo(() => {
    return examination?.videos.find((video) => video.region === activeRegion) || null;
  }, [activeRegion, examination]);
  const activeSelectedFrame = selectedFrameRegion ? selectedFrames[selectedFrameRegion] : null;
  const activeVideoFrames = activeVideo ? videoFramesByName[activeVideo.name] || [] : [];
  const activeVideoInfo = activeVideo ? videoInfoByName[activeVideo.name] || null : null;
  const activeExtractionState = activeVideo
    ? extractionStateByName[activeVideo.name] || { status: "idle", progress: 0 }
    : { status: "idle", progress: 0 };
  const activeProgressPercent = Math.round(activeExtractionState.progress * 100);
  const showCacheProgress = Boolean(activeVideo) && activeExtractionState.status !== "done";
  const isActiveVideoReady = Boolean(activeVideo) && activeVideoFrames.length > 0;
  const availableFrameCount = Math.max(activeVideoFrames.length, 1);
  const totalFrames = activeExtractionState.status === "done" ? Math.max(activeVideoFrames.length, 1) : availableFrameCount;
  const {
    fps,
    setFps,
    currentFrame,
    setCurrentFrame,
    isPlaying,
    stopPlayback,
    togglePlayback,
    adjustFps
  } = useFramePlayback({
    viewerMode,
    activeVideoFramesLength: activeVideoFrames.length,
    totalFrames
  });

  const dynamicRectangles = useMemo(() => {
    if (!isBLineSelected) {
      return [];
    }
    return generateRectanglesForFrame(currentFrame, activeRegion);
  }, [currentFrame, activeRegion, isBLineSelected]);

  const {
    isHoldMode,
    panOffset,
    isHoldGestureActive,
    toggleHoldMode,
    resetHold,
    handleHoldPointerDown,
    handleHoldPointerMove,
    stopHold
  } = useViewerHold({
    viewerStageRef,
    resetDependencies: [activeRegion, viewerMode]
  });
  const {
    isZoomMode,
    zoomScale,
    zoomOrigin,
    isZoomGestureActive,
    toggleZoomMode,
    resetZoom,
    handleZoomPointerDown,
    handleZoomPointerMove,
    stopZoom
  } = useViewerZoom({
    viewerStageRef,
    previewImageRef,
    resetDependencies: [activeRegion, viewerMode]
  });

  useEffect(() => {
    setViewerMode("video");
    stopPlayback();
    setCurrentFrame(() => {
      if (pendingFrameJumpRef.current?.region === activeRegion) {
        return pendingFrameJumpRef.current.frameIndex || 0;
      }

      return 0;
    });
  }, [activeRegion, setCurrentFrame, stopPlayback]);

  useEffect(() => {
    setCurrentFrame((current) => Math.min(current, Math.max(activeVideoFrames.length - 1, 0)));
  }, [activeVideoFrames.length]);

  useEffect(() => {
    setLastViewedFrames((current) => {
      if (current[activeRegion] === currentFrame) {
        return current;
      }

      return {
        ...current,
        [activeRegion]: currentFrame
      };
    });
  }, [activeRegion, currentFrame, setLastViewedFrames]);

  useEffect(() => {
    if (!pendingFrameJumpRef.current || pendingFrameJumpRef.current.region !== activeRegion) {
      return;
    }

    if (activeVideoFrames.length === 0) {
      return;
    }

    setCurrentFrame(Math.min(pendingFrameJumpRef.current.frameIndex || 0, Math.max(activeVideoFrames.length - 1, 0)));
    pendingFrameJumpRef.current = null;
  }, [activeRegion, activeVideoFrames.length]);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!fpsPopoverRef.current?.contains(event.target)) {
        setShowFpsPopover(false);
      }

      if (!magnifierPopoverRef.current?.contains(event.target)) {
        setShowMagnifierPopover(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);


  if (!examination) {
    return (
      <div className="page-stack">
        <WorkflowSteps currentStep="selection" context={{ patientId, examinationId }} />
        <section className="panel">
          <h2>Examination not found</h2>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  function handleSelectRegion(region) {
    const nextFrame = lastViewedFrames[region] || 0;

    if (activeRegion === region) {
      setViewerMode("video");
      setSelectedFrameRegion("");
      stopPlayback();
      setCurrentFrame(nextFrame);
      return;
    }

    pendingFrameJumpRef.current = {
      region,
      frameIndex: nextFrame
    };
    setActiveRegion(region);
    setSelectedFrameRegion("");
  }

  function handleSelectFrame() {
    if (!isActiveVideoReady || !activeVideoFrames[currentFrame]) {
      return;
    }

    const currentRectangles = isBLineSelected ? generateRectanglesForFrame(currentFrame, activeRegion) : [];
    const rdsScore = isRdsSelected ? (activeVideo?.rdsScore ?? 2) : null;

    setSelectedFrames((current) => ({
      ...current,
      [activeRegion]: {
        region: activeRegion,
        videoName: activeVideo?.name || "",
        thumbnail: activeVideoFrames[currentFrame],
        frameIndex: currentFrame,
        rectangles: currentRectangles,
        rdsScore: rdsScore
      }
    }));
    setViewerMode("video");
    setSelectedFrameRegion("");
  }

  function showDisabledActionMessage(message) {
    setDisabledActionMessage(message);
  }

  function clearDisabledActionMessage() {
    setDisabledActionMessage("");
  }

  function handleToggleHoldMode() {
    if (!isHoldMode && isZoomMode) {
      toggleZoomMode();
    }

    if (!isHoldMode && isMagnifierMode) {
      setIsMagnifierMode(false);
      setIsMagnifierActive(false);
      setShowMagnifierPopover(false);
    }

    toggleHoldMode();
  }

  function handleToggleZoomMode() {
    if (!isZoomMode && isHoldMode) {
      toggleHoldMode();
    }

    if (!isZoomMode && isMagnifierMode) {
      setIsMagnifierMode(false);
      setIsMagnifierActive(false);
      setShowMagnifierPopover(false);
    }

    toggleZoomMode();
  }

  function handleToggleMagnifierMode() {
    if (!isMagnifierMode && isHoldMode) {
      toggleHoldMode();
    }

    if (!isMagnifierMode && isZoomMode) {
      toggleZoomMode();
    }

    setIsMagnifierMode((current) => !current);
    setIsMagnifierActive(false);
    setShowMagnifierPopover(false);
  }

  function handleMagnifierSizeChange(nextSize) {
    setMagnifierConfig((current) => ({
      ...current,
      size: Math.max(MIN_MAGNIFIER_CONFIG.size, Math.min(MAX_MAGNIFIER_CONFIG.size, nextSize))
    }));
  }

  function handleMagnifierZoomChange(nextZoomFactor) {
    setMagnifierConfig((current) => ({
      ...current,
      zoomFactor: Math.max(MIN_MAGNIFIER_CONFIG.zoomFactor, Math.min(MAX_MAGNIFIER_CONFIG.zoomFactor, nextZoomFactor))
    }));
  }

  function handleRotateLeft() {
    setViewRotation((current) => normalizeRotation(current - 90));
  }

  function handleRotateRight() {
    setViewRotation((current) => normalizeRotation(current + 90));
  }

  function resetView() {
    resetHold();
    resetZoom();
    setMagnifierConfig(DEFAULT_MAGNIFIER_CONFIG);
    setViewRotation(0);
  }

  function handleApprove() {
    const actionLog = logSimpleAction(
      `Data Selection Completed`,
      ActionTypes.DATA_SELECTION,
      `Completed frame selection with ${Object.keys(selectedFrames).length} frames selected for patient ${patientId}, examination ${examinationId}`,
      { patientId, examinationId, selectedCount: Object.keys(selectedFrames).length }
    );

    try {
      const nextSelectionSignature = JSON.stringify(selectedFrames);

      if (committedSelectionSignature !== nextSelectionSignature) {
        resetWorkflowAfterStep(patientId, examinationId, 3);
        setCommittedSelectionSignature(nextSelectionSignature);

        try {
          window.sessionStorage.setItem(
            committedSelectionStateCacheKey,
            JSON.stringify({
              selectedFrames
            })
          );
        } catch {
          // Ignore session storage failures and keep the page functional.
        }
      }

      setActiveWorkflowContext({ patientId, examinationId, selectedModuleIds });
      completeAction(actionLog.id, "SUCCEEDED");
      
      navigate(`/preprocessing/${patientId}/${examinationId}`, {
        state: {
          ...location.state,
          patientId,
          examinationId,
          selectedFrames,
          selectedModuleIds
        }
      });
    } catch (error) {
      completeAction(actionLog.id, "FAILED");
    }
  }

  function handleTogglePlay() {
    setViewerMode("video");
    setSelectedFrameRegion("");

    if (currentFrame >= Math.max(activeVideoFrames.length - 1, 0)) {
      setCurrentFrame(0);
    }

    togglePlayback();
  }

  function handleSelectedFrameClick(region) {
    const selectedFrame = selectedFrames[region];

    if (!selectedFrame) {
      return;
    }

    pendingFrameJumpRef.current = {
      region,
      frameIndex: selectedFrame.frameIndex || 0
    };
    setViewerMode("video");
    setSelectedFrameRegion(region);
    stopPlayback();

    if (activeRegion === region) {
      setCurrentFrame(selectedFrame.frameIndex || 0);
      pendingFrameJumpRef.current = null;
      return;
    }

    setActiveRegion(region);
  }

  function seekToFrame(nextFrame) {
    const maxFrame = Math.max(activeVideoFrames.length - 1, 0);
    const boundedFrame = Math.max(0, Math.min(maxFrame, nextFrame));

    setViewerMode("video");
    setSelectedFrameRegion("");
    stopPlayback();
    setCurrentFrame(boundedFrame);
  }

  const {
    scrubberRailRef,
    handleRailMouseDown,
    handleRailPointerMove,
    stopRailDrag,
    getScrubberThumbTop
  } = useFrameScrubber({
    activeVideoFramesLength: activeVideoFrames.length,
    onSeekFrame: seekToFrame
  });

  function handleViewerWheel(event) {
    if (!activeVideo || activeVideoFrames.length <= 1) {
      return;
    }

    event.preventDefault();
    const direction = event.deltaY > 0 ? 1 : -1;
    seekToFrame(currentFrame + direction);
  }

  const selectedCount = Object.keys(selectedFrames).length;
  const isApprovedReady = regions.every((region) => selectedFrames[region]);
  const scrubberThumbTop = getScrubberThumbTop(currentFrame);
  const activeRegionSelection = selectedFrames[activeRegion];
  const isCurrentFrameAlreadySelected = Boolean(
    activeRegionSelection &&
    activeVideo &&
    activeRegionSelection.videoName === activeVideo.name &&
    activeRegionSelection.frameIndex === currentFrame
  );
  const isViewChanged = zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0 || viewRotation !== 0;

  function handleViewerPointerDown(event) {
    if (isMagnifierMode) {
      const stageElement = viewerStageRef.current;
      const imageElement = previewImageRef.current;

      if (!stageElement || !imageElement) {
        return;
      }

      const stageRect = stageElement.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      const insideImage =
        event.clientX >= imageRect.left &&
        event.clientX <= imageRect.right &&
        event.clientY >= imageRect.top &&
        event.clientY <= imageRect.bottom;

      if (!insideImage) {
        setIsMagnifierActive(false);
        return;
      }

      setMagnifierState(getMagnifierState(stageRect, imageRect, event.clientX, event.clientY, magnifierConfig));
      setIsMagnifierActive(true);
      event.currentTarget.setPointerCapture?.(event.pointerId);
      return;
    }

    if (isHoldMode) {
      handleHoldPointerDown(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerDown(event);
    }
  }

  function handleViewerPointerMove(event) {
    if (isMagnifierMode) {
      if ((event.buttons & 1) !== 1) {
        return;
      }

      const stageElement = viewerStageRef.current;
      const imageElement = previewImageRef.current;

      if (!stageElement || !imageElement) {
        return;
      }

      const stageRect = stageElement.getBoundingClientRect();
      const imageRect = imageElement.getBoundingClientRect();
      setMagnifierState(getMagnifierState(stageRect, imageRect, event.clientX, event.clientY, magnifierConfig));
      setIsMagnifierActive(true);
      return;
    }

    if (isHoldMode) {
      handleHoldPointerMove(event);
      return;
    }

    if (isZoomMode) {
      handleZoomPointerMove(event);
    }
  }

  function stopViewerInteraction(event) {
    if (isMagnifierActive) {
      setIsMagnifierActive(false);
    }

    stopHold(event);
    stopZoom(event);
  }

  return (
    <div className="page-stack selection-page">
      <section
        className={`selection-layout${showVideoMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}
      >
        <RegionVideosSidebar
          activeRegion={activeRegion}
          examinationId={examination.id}
          examinationVideos={examination.videos}
          onClose={() => setShowVideoMenu(false)}
          onOpen={() => setShowVideoMenu(true)}
          onSelectRegion={handleSelectRegion}
          regions={regions}
          selectedFrames={selectedFrames}
          showVideoMenu={showVideoMenu}
          showRdsScore={isRdsSelected}
        />

        <section className="selection-main panel">
          <ViewerHeader
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={activeVideo}
            activeVideoFrames={activeVideoFrames}
            adjustFps={adjustFps}
            clearDisabledActionMessage={clearDisabledActionMessage}
            currentFrame={currentFrame}
            fps={fps}
            fpsPopoverRef={fpsPopoverRef}
            handleApprove={handleApprove}
            handleMagnifierSizeChange={handleMagnifierSizeChange}
            handleMagnifierZoomChange={handleMagnifierZoomChange}
            handleToggleMagnifierMode={handleToggleMagnifierMode}
            handleRotateLeft={handleRotateLeft}
            handleRotateRight={handleRotateRight}
            handleSelectFrame={handleSelectFrame}
            handleToggleHoldMode={handleToggleHoldMode}
            handleTogglePlay={handleTogglePlay}
            handleToggleZoomMode={handleToggleZoomMode}
            isActiveVideoReady={isActiveVideoReady}
            isApprovedReady={isApprovedReady}
            isCurrentFrameAlreadySelected={isCurrentFrameAlreadySelected}
            isHoldMode={isHoldMode}
            isMagnifierMode={isMagnifierMode}
            isPlaying={isPlaying}
            isViewChanged={isViewChanged}
            isZoomMode={isZoomMode}
            magnifierConfig={magnifierConfig}
            magnifierPopoverRef={magnifierPopoverRef}
            resetView={resetView}
            setFps={setFps}
            setShowMagnifierPopover={setShowMagnifierPopover}
            setShowFpsPopover={setShowFpsPopover}
            showDisabledActionMessage={showDisabledActionMessage}
            showMagnifierPopover={showMagnifierPopover}
            showFpsPopover={showFpsPopover}
            viewerMode={viewerMode}
          />
          <ViewerStage
            activeProgressPercent={activeProgressPercent}
            activeRegion={activeRegion}
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={activeVideo}
            activeVideoFrames={activeVideoFrames}
            className={`viewer-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}${isMagnifierMode ? " magnifier-ready" : ""}${isMagnifierActive ? " magnifier-active" : ""}`}
            currentFrame={currentFrame}
            disabledActionMessage={disabledActionMessage}
            handleRailMouseDown={handleRailMouseDown}
            handleRailPointerMove={handleRailPointerMove}
            handleViewerPointerDown={handleViewerPointerDown}
            handleViewerPointerMove={handleViewerPointerMove}
            handleViewerWheel={handleViewerWheel}
            isActiveVideoReady={isActiveVideoReady}
            isMagnifierActive={isMagnifierActive}
            magnifierConfig={magnifierConfig}
            magnifierState={magnifierState}
            onStopViewerInteraction={stopViewerInteraction}
            panOffset={panOffset}
            previewImageRef={previewImageRef}
            scrubberRailRef={scrubberRailRef}
            scrubberThumbTop={scrubberThumbTop}
            selectedFrameRegion={selectedFrameRegion}
            showCacheProgress={showCacheProgress}
            stopRailDrag={stopRailDrag}
            viewerMode={viewerMode}
            viewRotation={viewRotation}
            viewerStageRef={viewerStageRef}
            zoomOrigin={zoomOrigin}
            zoomScale={zoomScale}
            customRectangles={dynamicRectangles}
            rdsScore={isRdsSelected ? (activeVideo?.rdsScore ?? 2) : null}
          />
        </section>

        <SelectedFramesSidebar
          onClose={() => setShowSelectedMenu(false)}
          onOpen={() => setShowSelectedMenu(true)}
          onSelectFrame={handleSelectedFrameClick}
          regions={regions}
          selectedCount={selectedCount}
          totalCount={regions.length}
          selectedFrameRegion={selectedFrameRegion}
          selectedFrames={selectedFrames}
          showSelectedMenu={showSelectedMenu}
          viewerMode={viewerMode}
        />
      </section>
    </div>
  );
}
