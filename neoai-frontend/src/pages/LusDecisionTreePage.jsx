import { useState, useMemo } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { LusDecisionTreeViewer } from "../components/LusDecisionTreeViewer";
import { LusProbabilityDistribution } from "../components/LusProbabilityDistribution";
import { LusSimulatorControls } from "../components/LusSimulatorControls";
import {
  DEFAULT_AI_PROBABILITIES,
  computeDiagnosisProbabilities
} from "../utils/lusDecisionTreeEngine";
import { findPatientById, getExaminationByIds, getReportById } from "../services/mockApi";

export function LusDecisionTreePage() {
  const { reportId = "REP-2001" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const report = useMemo(() => getReportById(reportId), [reportId]);
  const patientId = location.state?.patientId || report?.patientId || "P-101";
  const examinationId = location.state?.examinationId || report?.examinationId || "EX-1001";
  const patient = useMemo(() => findPatientById(patientId), [patientId]);
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [examinationId, patientId]);

  const [nodeProbs, setNodeProbs] = useState(DEFAULT_AI_PROBABILITIES);
  const [selectedDiagnosisId, setSelectedDiagnosisId] = useState(null);
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'tree' | 'distribution'
  const [showSimulator, setShowSimulator] = useState(true);

  // Compute exact probabilistic distributions
  const computationResult = useMemo(() => {
    return computeDiagnosisProbabilities(nodeProbs);
  }, [nodeProbs]);

  function handleChangeNodeProb(key, nextVal) {
    setNodeProbs((prev) => ({
      ...prev,
      [key]: nextVal
    }));
  }

  function handleApplyScenario(scenarioValues) {
    setNodeProbs(scenarioValues);
    setSelectedDiagnosisId(null);
  }

  function handleReset() {
    setNodeProbs(DEFAULT_AI_PROBABILITIES);
    setSelectedDiagnosisId(null);
  }

  return (
    <div className="page-stack lus-decision-tree-page">
      {/* Top Banner / Breadcrumb Header */}
      <section className="panel lus-page-header">
        <div className="lus-header-left">
          <div className="lus-badge-stack">
            <span className="lus-tag">CLINICAL DECISION SUPPORT</span>
            <span className="lus-tag secondary">LUS ALGORITHM REPORT</span>
          </div>
          <h1>Neonatal Lung Ultrasound Probabilistic Decision Tree</h1>
          <p className="lus-patient-summary">
            Patient: <strong>{patient?.fullName || "Infant Doe"}</strong> ({patient?.id || patientId}) &bull; Examination: <strong>{examination?.type || "Neonatal LUS"}</strong> &bull; Report: <strong>{reportId}</strong>
          </p>
        </div>

        <div className="lus-header-actions">
          <button
            type="button"
            className={`lus-pill-btn${showSimulator ? " active" : ""}`}
            onClick={() => setShowSimulator(!showSimulator)}
          >
            {showSimulator ? "Hide Simulator" : "Show AI Simulator"}
          </button>
          <Link to={`/report/${reportId}`} className="secondary-button">
            Go to Reporting
          </Link>
        </div>
      </section>

      {/* Simulator Section */}
      {showSimulator && (
        <section className="panel lus-sim-section">
          <LusSimulatorControls
            nodeProbs={nodeProbs}
            onChangeNodeProb={handleChangeNodeProb}
            onApplyScenario={handleApplyScenario}
            onReset={handleReset}
          />
        </section>
      )}

      {/* 1. Decision Tree Diagram Viewer (Full Width) */}
      <section className="panel lus-tree-panel full-width">
        <LusDecisionTreeViewer
          nodeProbs={nodeProbs}
          resultsMap={computationResult.resultsMap}
          selectedDiagnosisId={selectedDiagnosisId || computationResult.topDiagnosis.id}
          onSelectDiagnosis={setSelectedDiagnosisId}
        />
      </section>

      {/* 2. Results & Probability Distribution Section (Beneath the tree) */}
      <section className="panel lus-results-bottom-section">
        <LusProbabilityDistribution
          computationResult={computationResult}
          selectedDiagnosisId={selectedDiagnosisId}
          onSelectDiagnosis={setSelectedDiagnosisId}
        />
      </section>
    </div>
  );
}
