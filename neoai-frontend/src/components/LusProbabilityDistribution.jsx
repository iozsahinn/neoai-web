import { useMemo } from "react";

export function LusProbabilityDistribution({
  computationResult,
  selectedDiagnosisId,
  onSelectDiagnosis
}) {
  const { rankedResults, topDiagnosis } = computationResult;

  const activeDiagnosis = useMemo(() => {
    if (selectedDiagnosisId) {
      return rankedResults.find((d) => d.id === selectedDiagnosisId) || topDiagnosis;
    }
    return topDiagnosis;
  }, [selectedDiagnosisId, rankedResults, topDiagnosis]);

  return (
    <div className="lus-prob-panel">
      <div className="lus-primary-diagnosis-card" style={{ borderLeft: `6px solid ${activeDiagnosis.color}` }}>
        <div className="lus-primary-header">
          <div>
            <span className="lus-section-subtitle">CLINICAL DECISION SUPPORT ASSESSMENT</span>
            <h2 className="lus-diagnosis-title">{activeDiagnosis.name}</h2>
          </div>
          <div className="lus-probability-badge" style={{ backgroundColor: activeDiagnosis.color }}>
            {activeDiagnosis.formattedPercent}
          </div>
        </div>

        <div className="lus-path-badge">
          <strong>Decision Tree Path:</strong> {activeDiagnosis.pathDescription}
        </div>

        <div className="lus-severity-box">
          <strong>Clinical Severity &amp; Literature Findings:</strong>
          <p>{activeDiagnosis.severityNote}</p>
        </div>
      </div>

      <div className="lus-distribution-card">
        <div className="lus-dist-header">
          <h3>Probability Distribution across 9 Outcomes (Total 100%)</h3>
          <span className="lus-dist-hint">Click any diagnosis in the list to inspect its decision path</span>
        </div>

        <div className="lus-bars-container">
          {rankedResults.map((diag, index) => {
            const isSelected = diag.id === activeDiagnosis.id;
            const isTop = index === 0;

            return (
              <div
                key={diag.id}
                className={`lus-bar-row${isSelected ? " selected" : ""}${isTop ? " top" : ""}`}
                onClick={() => onSelectDiagnosis?.(diag.id)}
                role="button"
                tabIndex={0}
              >
                <div className="lus-bar-meta">
                  <span className="lus-bar-rank">#{index + 1}</span>
                  <span className="lus-bar-name">
                    {diag.name}
                    {isTop && <span className="lus-top-pill">Most Likely</span>}
                  </span>
                  <span className="lus-bar-percent" style={{ color: diag.color }}>
                    {diag.formattedPercent}
                  </span>
                </div>

                <div className="lus-progress-track">
                  <div
                    className="lus-progress-fill"
                    style={{
                      width: `${Math.max(1.5, diag.probability * 100)}%`,
                      backgroundColor: diag.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
