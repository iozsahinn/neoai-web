import { LUS_NODES, PRESET_SCENARIOS, DEFAULT_AI_PROBABILITIES } from "../utils/lusDecisionTreeEngine";

export function LusSimulatorControls({
  nodeProbs,
  onChangeNodeProb,
  onApplyScenario,
  onReset
}) {
  return (
    <div className="lus-simulator-panel">
      <div className="lus-sim-header">
        <div>
          <h3>AI Decision Support Simulator &amp; Clinical Controls</h3>
          <p className="lus-sim-subtitle">
            Simulate real-time probability shifts across all 9 outcomes by adjusting branching likelihoods.
          </p>
        </div>
        <button type="button" className="lus-reset-button" onClick={onReset}>
          Reset to Defaults
        </button>
      </div>

      <div className="lus-scenarios-bar">
        <span className="scenarios-label">Preset Clinical Scenarios:</span>
        <div className="scenarios-chips">
          {Object.values(PRESET_SCENARIOS).map((scenario) => (
            <button
              key={scenario.id}
              type="button"
              className="lus-scenario-chip"
              onClick={() => onApplyScenario(scenario.values)}
            >
              {scenario.label}
            </button>
          ))}
        </div>
      </div>

      <div className="lus-sliders-grid">
        {Object.entries(LUS_NODES).map(([key, node]) => {
          const currentVal = Math.round((nodeProbs[key] ?? 0.5) * 100);
          return (
            <div key={key} className="lus-slider-item">
              <div className="slider-meta">
                <span className="slider-name" title={node.description}>
                  {node.label}
                </span>
                <span className="slider-val">{currentVal}% (Present)</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={currentVal}
                onChange={(e) => onChangeNodeProb(key, parseFloat(e.target.value) / 100)}
                className="lus-slider-input"
              />
              <div className="slider-scale">
                <span>0% (Absent)</span>
                <span>100% (Present)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
