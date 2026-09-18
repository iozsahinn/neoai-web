import { useState } from "react";
import { parseAiBbox } from "../utils/imageOverlayUtils";

export function ViewerStage({
  activeRegion,
  activeSelectedFrame,
  activeVideo,
  activeVideoFrames,
  activeProgressPercent,
  className,
  currentFrame,
  disabledActionMessage,
  handleViewerPointerDown,
  handleViewerPointerMove,
  handleViewerWheel,
  isMagnifierActive,
  isActiveVideoReady,
  magnifierConfig,
  magnifierState,
  onStopViewerInteraction,
  panOffset,
  previewImageRef,
  scrubberRailRef,
  scrubberThumbTop,
  selectedFrameRegion,
  showCacheProgress,
  stopRailDrag,
  handleRailMouseDown,
  handleRailPointerMove,
  viewerMode,
  viewerStageRef,
  framePlaceholderMessage = "Preparing frame...",
  viewerOverlayMessage = "",
  viewRotation,
  zoomOrigin,
  zoomScale,
  customRectangles,
  rdsScore
}) {
  const [imageAspectRatio, setImageAspectRatio] = useState(1.68);
  const activeFrameSrc =
    isActiveVideoReady && activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      ? activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      : "";
  const displayedFrameSrc =
    viewerMode === "frame" && activeSelectedFrame ? activeSelectedFrame.thumbnail : activeFrameSrc;

  // --- DYNAMIC RECTANGLE RENDERING (PERCENTAGE & NORMALIZED COORDINATES) ---
  const rectangleOverlays = customRectangles?.map((rawRect, idx) => {
    const rect = parseAiBbox(rawRect, idx);
    if (!rect) return null;

    const left = typeof rect.leftPercent === "number" ? `${rect.leftPercent}%` : `${rect.topLeft?.x || 0}px`;
    const top = typeof rect.topPercent === "number" ? `${rect.topPercent}%` : `${rect.topLeft?.y || 0}px`;
    const width = typeof rect.widthPercent === "number" ? `${rect.widthPercent}%` : `${(rect.bottomRight?.x || 0) - (rect.topLeft?.x || 0)}px`;
    const height = typeof rect.heightPercent === "number" ? `${rect.heightPercent}%` : `${(rect.bottomRight?.y || 0) - (rect.topLeft?.y || 0)}px`;

    return (
      <div
        key={rect.id || `rect-${idx}`}
        style={{
          position: "absolute",
          left,
          top,
          width,
          height,
          border: "2px solid #22c55e",
          boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.6), 0 0 8px rgba(34, 197, 94, 0.5)",
          borderRadius: "4px",
          pointerEvents: "none",
          zIndex: 10,
          boxSizing: "border-box"
        }}
      />
    );
  });
  // --- END ---

  const effectiveRdsScore =
    typeof rdsScore === "number"
      ? rdsScore
      : rdsScore === null
        ? null
        : viewerMode === "frame" && typeof activeSelectedFrame?.rdsScore === "number"
          ? activeSelectedFrame.rdsScore
          : null;

  const rdsScoreBadge =
    effectiveRdsScore !== null ? (
      <div
        className="viewer-rds-badge"
        style={{
          position: "absolute",
          top: "20px",
          left: "20px",
          background: "rgba(8, 15, 30, 0.94)",
          backdropFilter: "blur(14px)",
          border: "2px solid rgba(56, 189, 248, 0.65)",
          padding: "10px 22px",
          borderRadius: "10px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          gap: "16px",
          zIndex: 25,
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.7), 0 0 20px rgba(56, 189, 248, 0.3)"
        }}
      >
        <span
          style={{
            color: "#94a3b8",
            fontSize: "14px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase"
          }}
        >
          RDS Score
        </span>
        <span
          style={{
            color: "#38bdf8",
            fontSize: "28px",
            fontWeight: 900,
            lineHeight: 1,
            textShadow: "0 0 14px rgba(56, 189, 248, 0.6)"
          }}
        >
          {effectiveRdsScore}
        </span>
      </div>
    ) : null;

  const magnifierOverlay =
    isMagnifierActive && displayedFrameSrc ? (
      <div
        aria-hidden="true"
        className="viewer-magnifier"
        style={{
          left: `${magnifierState.x}px`,
          top: `${magnifierState.y}px`,
          width: `${magnifierConfig.size}px`,
          height: `${magnifierConfig.size}px`,
          backgroundImage: `url("${displayedFrameSrc}")`,
          backgroundPosition: `${magnifierState.backgroundOffsetX}px ${magnifierState.backgroundOffsetY}px`,
          backgroundSize: `${magnifierState.backgroundWidth}px ${magnifierState.backgroundHeight}px`
        }}
      />
    ) : null;
  const disabledMessageOverlay = disabledActionMessage ? (
    <div className="viewer-disabled-action-message">{disabledActionMessage}</div>
  ) : null;
  const viewerMessageOverlay = viewerOverlayMessage ? <div className="viewer-overlay-message">{viewerOverlayMessage}</div> : null;

  const renderFrameWithOverlays = (frameSrc, altText) => (
    <div
      className="selection-frame-preview"
      style={{
        position: 'relative',
        width: 'auto',
        height: '100%',
        aspectRatio: imageAspectRatio ? `${imageAspectRatio}` : undefined,
        transform: `translate(calc(-50% + ${panOffset.x}px), ${panOffset.y}px) rotate(${viewRotation}deg) scale(${zoomScale})`,
        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
      }}
    >
      <img
        alt={altText}
        draggable={false}
        ref={previewImageRef}
        src={frameSrc}
        onLoad={(event) => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth > 0 && naturalHeight > 0) {
            setImageAspectRatio(naturalWidth / naturalHeight);
          }
        }}
        style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block' }}
      />
      {rectangleOverlays}
    </div>
  );

  return (
    <div className="viewer-shell">
      <div
        className={className}
        onLostPointerCapture={onStopViewerInteraction}
        onPointerCancel={onStopViewerInteraction}
        onPointerDown={handleViewerPointerDown}
        onPointerMove={handleViewerPointerMove}
        onPointerUp={onStopViewerInteraction}
        onWheel={handleViewerWheel}
        ref={viewerStageRef}
      >
        {rdsScoreBadge}
        {viewerMode === "frame" && activeSelectedFrame ? (
          activeSelectedFrame.thumbnail ? (
            <>
              {renderFrameWithOverlays(activeSelectedFrame.thumbnail, `${selectedFrameRegion} selected frame`)}
              {magnifierOverlay}
              {disabledMessageOverlay}
              {viewerMessageOverlay}
            </>
          ) : (
            <div className="viewer-placeholder viewer-loading-state">
              {viewerOverlayMessage || framePlaceholderMessage}
            </div>
          )
        ) : activeVideo ? (
          <>
            {activeFrameSrc ? (
              renderFrameWithOverlays(activeFrameSrc, `${activeRegion} frame ${currentFrame + 1}`)
            ) : (
              <div className="viewer-placeholder viewer-loading-state">Preparing frames...</div>
            )}
            <div
              aria-label="Frame scrubber"
              aria-valuemax={Math.max(0, activeVideoFrames.length - 1)}
              aria-valuemin="0"
              aria-valuenow={Math.min(currentFrame, Math.max(0, activeVideoFrames.length - 1))}
              className="viewer-frame-rail"
              onPointerCancel={stopRailDrag}
              onPointerDown={handleRailMouseDown}
              onPointerMove={handleRailPointerMove}
              onPointerUp={stopRailDrag}
              onLostPointerCapture={stopRailDrag}
              ref={scrubberRailRef}
              role="slider"
              tabIndex={0}
            >
              <div className="viewer-frame-rail-track" />
              <div className="viewer-frame-rail-thumb" style={{ top: `${scrubberThumbTop}%` }} />
            </div>
            <div className="viewer-stage-status">
              {showCacheProgress ? <span className="viewer-cache-status">Loading {activeProgressPercent}%</span> : null}
              {effectiveRdsScore !== null ? (
                <span style={{ color: "#58a6ff", fontWeight: 700, marginRight: "12px" }}>
                  RDS: {effectiveRdsScore}
                </span>
              ) : null}
              <span className="viewer-frame-status">
                Frame {isActiveVideoReady ? Math.min(currentFrame + 1, Math.max(activeVideoFrames.length, 1)) : 0} /{" "}
                {Math.max(activeVideoFrames.length, 0)}
              </span>
            </div>
            {magnifierOverlay}
            {disabledMessageOverlay}
            {viewerMessageOverlay}
          </>
        ) : (
          <div className="viewer-placeholder">No video selected</div>
        )}
      </div>
    </div>
  );
}
