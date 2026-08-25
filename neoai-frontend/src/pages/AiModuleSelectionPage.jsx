import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AiModuleOptionsSidebar } from "../components/AiModuleOptionsSidebar";
import { AiViewerToolbar } from "../components/AiViewerToolbar";
import { SelectedFramesSidebar } from "../components/SelectedFramesSidebar";
import { ViewerStage } from "../components/ViewerStage";
import { useViewerHold } from "../hooks/useViewerHold";
import { useViewerZoom } from "../hooks/useViewerZoom";
import { getExaminationByIds } from "../services/mockApi";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";
import { resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const DEFAULT_MODULE_IDS = ["rds-score"];
const DEFAULT_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };
const MAX_MAGNIFIER_CONFIG = { size: 500, zoomFactor: 8 };
const MIN_MAGNIFIER_CONFIG = { size: 200, zoomFactor: 2 };

function getCommittedAiModuleStateCacheKey(patientId, examinationId) {
  return `neoai-ai-module-committed:${patientId}:${examinationId}`;
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

export function AiModuleSelectionPage() {
  const { patientId, examinationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const magnifierPopoverRef = useRef(null);
  const viewerStageRef = useRef(null);
  const previewImageRef = useRef(null);
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [patientId, examinationId]);
  const committedAiModuleStateCacheKey = getCommittedAiModuleStateCacheKey(patientId, examinationId);
  const selectedFrameMap = location.state?.selectedFrames || location.state?.processedFrames || {};

  // Build effective preview map from existing frames or examination videos
  const effectiveFrameMap = useMemo(() => {
    const map = {};
    regions.forEach((region) => {
      if (selectedFrameMap[region]) {
        map[region] = selectedFrameMap[region];
      } else {
        const video = examination?.videos?.find((v) => v.region === region);
        if (video) {
          map[region] = {
            region,
            thumbnail: video.thumbnail,
            frameIndex: 0
          };
        }
      }
    });
    return map;
  }, [examination, selectedFrameMap]);

  const [showOptionsMenu, setShowOptionsMenu] = useState(true);
  const [showSelectedMenu, setShowSelectedMenu] = useState(true);
  const [disabledActionMessage, setDisabledActionMessage] = useState("");
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

  const [selectedModuleIds, setSelectedModuleIds] = useState(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }

    if (location.state?.selectedModuleId) {
      return [location.state.selectedModuleId];
    }

    try {
      const savedState = window.sessionStorage.getItem(committedAiModuleStateCacheKey);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        if (Array.isArray(parsedState?.selectedModuleIds) && parsedState.selectedModuleIds.length > 0) {
          return parsedState.selectedModuleIds;
        }
      }
    } catch {
      return DEFAULT_MODULE_IDS;
    }

    return DEFAULT_MODULE_IDS;
  });

  const [committedModuleSignature, setCommittedModuleSignature] = useState(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return JSON.stringify(location.state.selectedModuleIds);
    }

    if (location.state?.selectedModuleId) {
      return JSON.stringify([location.state.selectedModuleId]);
    }

    try {
      const savedCommittedState = window.sessionStorage.getItem(committedAiModuleStateCacheKey);
      if (!savedCommittedState) {
        return null;
      }
      const parsedCommittedState = JSON.parse(savedCommittedState);
      if (Array.isArray(parsedCommittedState?.selectedModuleIds) && parsedCommittedState.selectedModuleIds.length > 0) {
        return JSON.stringify(parsedCommittedState.selectedModuleIds);
      }
    } catch {
      return null;
    }

    return null;
  });

  const [activeRegion, setActiveRegion] = useState(
    location.state?.activePreprocessingRegion || examination?.videos?.[0]?.region || "r1"
  );

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
    resetDependencies: [activeRegion]
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
    resetDependencies: [activeRegion]
  });

  useEffect(() => {
    function handlePointerDown(event) {
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
        <section className="panel">
          <h2>Examination not found</h2>
          <Link className="secondary-button" to="/query">
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  const activeSelectedFrame = activeRegion ? effectiveFrameMap[activeRegion] || null : null;
  const selectedModuleLabel =
    selectedModuleIds.length > 0
      ? selectedModuleIds.map((moduleId) => (moduleId === "b-line" ? "B-LINE" : "RDS-SCORE")).join(", ")
      : "No module selected";
  const isViewChanged = zoomScale !== 1 || panOffset.x !== 0 || panOffset.y !== 0 || viewRotation !== 0;

  function handleToggleModule(moduleId) {
    setDisabledActionMessage("");
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
    );
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

  function handleContinue() {
    const actionLog = logSimpleAction(
      `AI Module Selected: ${selectedModuleIds.join(", ")}`,
      ActionTypes.AI_ANALYSIS,
      `Selected AI modules: ${selectedModuleIds.join(", ")} for patient ${patientId}, examination ${examinationId}`,
      { patientId, examinationId, selectedModuleIds, moduleCount: selectedModuleIds.length }
    );

    try {
      const nextModuleSignature = JSON.stringify(selectedModuleIds);

      setActiveWorkflowContext({ patientId, examinationId, selectedModuleIds });

      try {
        window.sessionStorage.setItem(
          committedAiModuleStateCacheKey,
          JSON.stringify({
            selectedModuleIds
          })
        );
      } catch {
        // Ignore session storage failures and keep the page functional.
      }

      if (committedModuleSignature !== nextModuleSignature) {
        resetWorkflowAfterStep(patientId, examinationId, 2);
        setCommittedModuleSignature(nextModuleSignature);
      }

      completeAction(actionLog.id, "SUCCEEDED");
      
      navigate(`/selection/${patientId}/${examinationId}`, {
        state: {
          ...location.state,
          patientId,
          examinationId,
          selectedModuleIds
        }
      });
    } catch (error) {
      completeAction(actionLog.id, "FAILED");
    }
  }

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
      <section className={`selection-layout${showOptionsMenu ? "" : " hide-left"}${showSelectedMenu ? "" : " hide-right"}`}>
        <AiModuleOptionsSidebar
          selectedModuleIds={selectedModuleIds}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
          onToggleModule={handleToggleModule}
        />

        <section className="selection-main panel">
          <AiViewerToolbar
            centerContent={<div className="viewer-control-cluster preprocessing-center-chip ai-module-center-chip">{selectedModuleLabel} selected</div>}
            handleMagnifierSizeChange={handleMagnifierSizeChange}
            handleMagnifierZoomChange={handleMagnifierZoomChange}
            handleRotateLeft={handleRotateLeft}
            handleRotateRight={handleRotateRight}
            handleToggleHoldMode={handleToggleHoldMode}
            handleToggleMagnifierMode={handleToggleMagnifierMode}
            handleToggleZoomMode={handleToggleZoomMode}
            isHoldMode={isHoldMode}
            isMagnifierMode={isMagnifierMode}
            isViewChanged={isViewChanged}
            isZoomMode={isZoomMode}
            magnifierConfig={magnifierConfig}
            magnifierPopoverRef={magnifierPopoverRef}
            resetView={resetView}
            rightContent={
              <span
                onMouseEnter={() => {
                  if (selectedModuleIds.length === 0) {
                    showDisabledActionMessage("Select at least one AI module before continuing.");
                  }
                }}
                onMouseLeave={clearDisabledActionMessage}
              >
                <button className="primary-button" type="button" onClick={handleContinue} disabled={selectedModuleIds.length === 0}>
                  Continue
                </button>
              </span>
            }
            setShowMagnifierPopover={setShowMagnifierPopover}
            showMagnifierPopover={showMagnifierPopover}
          />

          <ViewerStage
            activeProgressPercent={0}
            activeRegion={activeRegion}
            activeSelectedFrame={activeSelectedFrame}
            activeVideo={null}
            activeVideoFrames={[]}
            className={`viewer-stage${isHoldMode ? " hold-ready" : ""}${isHoldGestureActive ? " hold-active" : ""}${isZoomMode ? " zoom-ready" : ""}${isZoomGestureActive ? " zoom-active" : ""}${isMagnifierMode ? " magnifier-ready" : ""}${isMagnifierActive ? " magnifier-active" : ""}`}
            currentFrame={0}
            disabledActionMessage={disabledActionMessage}
            handleRailMouseDown={() => {}}
            handleRailPointerMove={() => {}}
            handleViewerPointerDown={handleViewerPointerDown}
            handleViewerPointerMove={handleViewerPointerMove}
            handleViewerWheel={() => {}}
            isActiveVideoReady={false}
            isMagnifierActive={isMagnifierActive}
            magnifierConfig={magnifierConfig}
            magnifierState={magnifierState}
            onStopViewerInteraction={stopViewerInteraction}
            panOffset={panOffset}
            previewImageRef={previewImageRef}
            scrubberRailRef={null}
            scrubberThumbTop={0}
            selectedFrameRegion={activeRegion}
            showCacheProgress={false}
            stopRailDrag={() => {}}
            viewerMode="frame"
            viewRotation={viewRotation}
            viewerStageRef={viewerStageRef}
            framePlaceholderMessage="Preparing examination preview..."
            viewerOverlayMessage=""
            zoomOrigin={zoomOrigin}
            zoomScale={zoomScale}
            rdsScore={null}
          />
        </section>

        <SelectedFramesSidebar
          onClose={() => setShowSelectedMenu(false)}
          onOpen={() => setShowSelectedMenu(true)}
          onSelectFrame={setActiveRegion}
          regions={regions}
          selectedFrameRegion={activeRegion}
          selectedFrames={effectiveFrameMap}
          showSelectedMenu={showSelectedMenu}
          viewerMode="frame"
        />
      </section>
    </div>
  );
}
