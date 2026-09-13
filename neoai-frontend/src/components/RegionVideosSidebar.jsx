export function RegionVideosSidebar({
  examinationId,
  examinationVideos,
  regions,
  activeRegion,
  selectedFrames,
  showVideoMenu,
  onClose,
  onOpen,
  onSelectRegion,
  showRdsScore = true
}) {
  return (
    <aside className={`selection-sidebar panel${showVideoMenu ? "" : " collapsed"}`}>
      {showVideoMenu ? (
        <>
          <div className="region-videos-sidebar-header">
            <div className="region-videos-sidebar-copy">
              <span className="selection-toolbar-kicker">Region Videos</span>
              <strong>{examinationId}</strong>
            </div>
            <button className="panel-arrow-toggle" type="button" onClick={onClose}>
              ‹
            </button>
          </div>

          <div className="region-video-list">
            {regions.map((region) => {
              const regionVideo = examinationVideos.find((video) => video.region === region);
              const isActive = activeRegion === region;
              const isSelected = Boolean(selectedFrames[region]);

              return (
                <button
                  key={region}
                  className={`region-video-item${isActive ? " active" : ""}${isSelected ? " completed" : ""}`}
                  type="button"
                  onClick={() => onSelectRegion(region)}
                >
                  <img
                    alt={`${regionVideo?.name || region} thumbnail`}
                    className="region-video-thumbnail"
                    src={regionVideo?.thumbnail}
                  />
                  <div className="region-video-meta">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                      <strong>{region.toUpperCase()}</strong>
                      {showRdsScore && regionVideo?.rdsScore !== undefined ? (
                        <span style={{ fontSize: "11px", color: "#6db0ff", fontWeight: 700, background: "rgba(109, 176, 255, 0.12)", padding: "1px 6px", borderRadius: "4px" }}>
                          RDS: {regionVideo.rdsScore}
                        </span>
                      ) : null}
                    </div>
                    <p>{regionVideo?.name || "No video"}</p>
                    <span className={`selection-status${isSelected ? " done" : ""}`}>
                      {isSelected ? "Frame selected" : "Select frame"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}
    </aside>
  );
}
