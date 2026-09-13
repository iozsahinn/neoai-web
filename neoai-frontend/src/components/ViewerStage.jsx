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
  const activeFrameSrc =
    isActiveVideoReady && activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      ? activeVideoFrames[Math.min(currentFrame, Math.max(activeVideoFrames.length - 1, 0))]
      : "";
  const displayedFrameSrc =
    viewerMode === "frame" && activeSelectedFrame ? activeSelectedFrame.thumbnail : activeFrameSrc;

  // --- DYNAMIC RECTANGLE RENDERING ---
  const rectangleOverlays = customRectangles?.map(rect => (
    <div
      key={rect.id}
      style={{
        position: 'absolute',
        left: `${rect.topLeft.x}px`,
        top: `${rect.topLeft.y}px`,
        width: `${rect.bottomRight.x - rect.topLeft.x}px`,
        height: `${rect.bottomRight.y - rect.topLeft.y}px`,
        border: '3px solid #00FF00',
        pointerEvents: 'none',
        zIndex: 10
      }}
    />
  ));
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
          top: "14px",
          left: "14px",
          background: "rgba(13, 22, 38, 0.88)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(88, 166, 255, 0.35)",
          padding: "5px 12px",
          borderRadius: "6px",
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          zIndex: 15,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)"
        }}
      >
        <span style={{ color: "#8b949e", fontSize: "10px", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          RDS Score
        </span>
        <span style={{ color: "#58a6ff", fontSize: "14px", fontWeight: 800 }}>{effectiveRdsScore}</span>
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
        width: '100%',
        height: '100%',
        transform: `translate(calc(-50% + ${panOffset.x}px), ${panOffset.y}px) rotate(${viewRotation}deg) scale(${zoomScale})`,
        transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`
      }}
    >
      <img
        alt={altText}
        draggable={false}
        ref={previewImageRef}
        src={frameSrc}
        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
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
