import { useEffect, useMemo, useState } from "react";
import { pdf } from "@react-pdf/renderer";
import { Link, useLocation, useParams } from "react-router-dom";
import { ReportPdfDocument } from "../components/ReportPdfDocument";
import { aiRegionResults } from "../data/mockData";
import { useAuth } from "../context/AuthContext";
import { findPatientById, getExaminationByIds, getReportById } from "../services/mockApi";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";
import { burnRectanglesOnImage } from "../utils/imageOverlayUtils";

const regions = ["r1", "r2", "r3", "r4", "r5", "r6"];
const moduleLabelMap = {
  "rds-score": "RDS-SCORE",
  "b-line": "B-LINE"
};
const clinicalIndicationOptions = [
  { id: "respiratory-distress", label: "Respiratory distress" },
  { id: "suspected-rds", label: "Suspected RDS" },
  { id: "ttn-differential", label: "TTN differential" },
  { id: "suspected-pneumonia", label: "Suspected pneumonia" },
  { id: "follow-up", label: "Follow-up / serial evaluation" }
];

function getSelectionStateCacheKey(patientId, examinationId) {
  return `neoai-selection:${patientId}:${examinationId}`;
}

function readSelectedFramesFromSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return {};
  }

  try {
    const rawValue = window.sessionStorage.getItem(getSelectionStateCacheKey(patientId, examinationId));

    if (!rawValue) {
      return {};
    }

    const parsedValue = JSON.parse(rawValue);
    return parsedValue?.selectedFrames || {};
  } catch {
    return {};
  }
}

function getCommittedAiModuleStateCacheKey(patientId, examinationId) {
  return `neoai-ai-module-committed:${patientId}:${examinationId}`;
}

function readSelectedModulesFromSession(patientId, examinationId) {
  if (!patientId || !examinationId) {
    return [];
  }

  try {
    const rawValue = window.sessionStorage.getItem(getCommittedAiModuleStateCacheKey(patientId, examinationId));

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue?.selectedModuleIds) ? parsedValue.selectedModuleIds : [];
  } catch {
    return [];
  }
}

function formatPercent(value) {
  return `%${Math.round(value * 100)}`;
}

function getFrameImageSource(frameValue) {
  if (!frameValue) {
    return "";
  }

  if (typeof frameValue === "string") {
    return frameValue;
  }

  return frameValue.thumbnail || "";
}

function getOverallSeverity(totalScore) {
  if (totalScore <= 3) {
    return {
      label: "Minimal Loss of Aeration",
      summary: "Only limited regional involvement is visible on the selected clips."
    };
  }

  if (totalScore <= 8) {
    return {
      label: "Mild to Moderate Disease Burden",
      summary: "Regional abnormalities are present but not yet diffuse across all selected fields."
    };
  }

  if (totalScore <= 13) {
    return {
      label: "Moderate Diffuse Disease Burden",
      summary: "Multi-region aeration loss is present and should be correlated with bedside respiratory status."
    };
  }

  return {
    label: "Severe Diffuse Disease Burden",
    summary: "The regional score distribution suggests advanced diffuse lung involvement."
  };
}

function getDiagnosisProbabilities(totalScore) {
  const scores = [
    {
      label: "Normal lung pattern",
      probability: totalScore <= 3 ? 0.58 : 0.08
    },
    {
      label: "Respiratory Distress Syndrome (RDS)",
      probability: totalScore >= 9 ? 0.74 : totalScore >= 5 ? 0.46 : 0.18
    },
    {
      label: "Transient Tachypnea of the Newborn (TTN)",
      probability: totalScore >= 4 && totalScore <= 10 ? 0.49 : 0.22
    },
    {
      label: "Neonatal pneumonia",
      probability: highlightedProbability(totalScore, 7, 0.37, 0.16)
    },
    {
      label: "Other",
      probability: 0.09
    }
  ];

  return scores;
}

function highlightedProbability(totalScore, threshold, highValue, lowValue) {
  return totalScore >= threshold ? highValue : lowValue;
}

export function ReportingPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const { token: user } = useAuth();
  const report = useMemo(() => getReportById(reportId), [reportId]);
  const patientId = location.state?.patientId || report?.patientId;
  const examinationId = location.state?.examinationId || report?.examinationId;
  const patient = useMemo(() => findPatientById(patientId), [patientId]);
  const examination = useMemo(() => getExaminationByIds(patientId, examinationId), [examinationId, patientId]);
  const [finalDiagnosis, setFinalDiagnosis] = useState("");
  const [treatmentRecommendation, setTreatmentRecommendation] = useState("");
  const [followUpRecommendation, setFollowUpRecommendation] = useState("");
  const [selectedClinicalIndications, setSelectedClinicalIndications] = useState([
    "respiratory-distress",
    "suspected-rds"
  ]);
  const [otherClinicalIndication, setOtherClinicalIndication] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFormat, setExportFormat] = useState("pdf");
  const sessionSelectedFrameMap = useMemo(
    () => readSelectedFramesFromSession(patientId, examinationId),
    [examinationId, patientId]
  );
  const sessionSelectedModuleIds = useMemo(
    () => readSelectedModulesFromSession(patientId, examinationId),
    [examinationId, patientId]
  );
  const selectedFrameMap = location.state?.processedFrames || location.state?.selectedFrames || sessionSelectedFrameMap;
  const selectedModuleIds = useMemo(() => {
    if (Array.isArray(location.state?.selectedModuleIds) && location.state.selectedModuleIds.length > 0) {
      return location.state.selectedModuleIds;
    }

    if (location.state?.selectedModuleId) {
      return [location.state.selectedModuleId];
    }

    if (sessionSelectedModuleIds.length > 0) {
      return sessionSelectedModuleIds;
    }

    return ["rds-score", "b-line"];
  }, [location.state, sessionSelectedModuleIds]);

  const selectedRegions = useMemo(() => {
    const stateRegions = regions.filter((region) => selectedFrameMap[region]);

    if (stateRegions.length > 0) {
      return stateRegions;
    }

    return examination?.videos?.map((video) => video.region) || [];
  }, [examination?.videos, selectedFrameMap]);

  const isRdsSelected = selectedModuleIds.includes("rds-score");
  const isBLineSelected = selectedModuleIds.includes("b-line");

  const [annotatedImages, setAnnotatedImages] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function prepareAnnotatedImages() {
      const entries = await Promise.all(
        selectedRegions.map(async (region) => {
          const frameData = selectedFrameMap[region];
          const matchingVideo = examination?.videos?.find((video) => video.region === region);
          const baseImg = getFrameImageSource(frameData) || matchingVideo?.thumbnail || "";
          const rects = frameData?.rectangles || [];

          if (!baseImg) {
            return [region, ""];
          }

          if (isBLineSelected && Array.isArray(rects) && rects.length > 0) {
            const composite = await burnRectanglesOnImage(baseImg, rects);
            return [region, composite];
          }

          return [region, baseImg];
        })
      );

      if (isMounted) {
        setAnnotatedImages(Object.fromEntries(entries));
      }
    }

    prepareAnnotatedImages();

    return () => {
      isMounted = false;
    };
  }, [examination?.videos, isBLineSelected, selectedFrameMap, selectedRegions]);

  const regionReportRows = useMemo(
    () =>
      selectedRegions.map((region) => {
        const regionResult = aiRegionResults[region];
        const matchingVideo = examination?.videos?.find((video) => video.region === region);
        const frameData = selectedFrameMap[region];
        const frameIndex =
          typeof frameData === "object" && frameData !== null && Number.isInteger(frameData.frameIndex)
            ? frameData.frameIndex
            : null;
        const rawImage = getFrameImageSource(frameData) || matchingVideo?.thumbnail || "";
        const image = annotatedImages[region] || rawImage;
        const bLineCount = isBLineSelected
          ? (Array.isArray(frameData?.rectangles)
              ? frameData.rectangles.length
              : (regionResult?.b_line_module?.count ?? 0))
          : "-";
        const regionScore = isRdsSelected
          ? (typeof frameData === "object" && frameData !== null && Number.isInteger(frameData.rdsScore)
              ? frameData.rdsScore
              : (matchingVideo?.rdsScore ?? regionResult?.rds_score_module?.score ?? 0))
          : "-";

        return {
          region,
          image,
          frameIndex,
          videoName: frameData?.videoName || matchingVideo?.name || "-",
          comment: matchingVideo?.comment || "-",
          imageQuality: regionResult?.image_quality || "unknown",
          bLineCount,
          regionScore
        };
      }),
    [annotatedImages, examination?.videos, isBLineSelected, isRdsSelected, selectedFrameMap, selectedRegions]
  );

  const totalScore = isRdsSelected
    ? regionReportRows.reduce((sum, row) => sum + (typeof row.regionScore === "number" ? row.regionScore : 0), 0)
    : 0;
  const overallSeverity = getOverallSeverity(totalScore);
  const diagnosisProbabilities = getDiagnosisProbabilities(totalScore);
  const highlightedRegions = regionReportRows
    .filter((row) => row.regionScore >= 2 || row.bLineCount >= 3)
    .map((row) => row.region.toUpperCase());
  const signedBy = user?.fullName || report?.reviewedBy || "Dr. Elif Kaya";
  const patientFields = useMemo(
    () => [
      { label: "Patient ID:", value: report?.patientId || "-" },
      { label: "Full Name:", value: patient?.name || "-" },
      { label: "Date of Birth:", value: report?.dateOfBirth || "-" },
      { label: "Gestational Age:", value: report?.gestationalAge || "-" },
      { label: "Birth Weight:", value: report?.birthWeight || "-" },
      { label: "Postnatal Age:", value: report?.postnatalAge || "-" },
      { label: "Clinic (NICU):", value: report?.clinic || "-" },
      { label: "Bed Number:", value: report?.bedNumber || "-" },
      { label: "Scan Date / Time:", value: report?.reportDate || "-" },
      { label: "AI Software Version (NeoAI LUS Assistant):", value: report?.softwareVersion || "-" }
    ],
    [patient?.name, report]
  );
  const selectedIndicationLabels = clinicalIndicationOptions
    .map((option) => ({
      label: option.label,
      checked: selectedClinicalIndications.includes(option.id)
    }));
  const pdfReportData = useMemo(
    () => ({
      title: report?.title || "NeoAi LUS Assistant",
      patientFields,
      selectedIndications: selectedIndicationLabels,
      otherIndication: {
        checked: otherClinicalIndication.trim().length > 0,
        value: otherClinicalIndication
      },
      selectedModuleIds,
      regionRows: regionReportRows,
      diagnosisProbabilities: diagnosisProbabilities.map((item) => ({
        label: item.label,
        probability: formatPercent(item.probability)
      })),
      totalScore,
      overallSeverityLabel: overallSeverity.label,
      highlightedRegions,
      finalDiagnosis,
      treatmentRecommendation,
      followUpRecommendation,
      signedBy
    }),
    [
      diagnosisProbabilities,
      finalDiagnosis,
      followUpRecommendation,
      highlightedRegions,
      otherClinicalIndication,
      overallSeverity.label,
      patientFields,
      selectedModuleIds,
      regionReportRows,
      report?.title,
      selectedIndicationLabels,
      signedBy,
      totalScore,
      treatmentRecommendation
    ]
  );

  function handleClinicalIndicationToggle(optionId) {
    setSelectedClinicalIndications((current) =>
      current.includes(optionId) ? current.filter((item) => item !== optionId) : [...current, optionId]
    );
  }

  async function handleExportPdf() {
    const actionLog = logSimpleAction(
      `Report Exported: ${reportId}`,
      ActionTypes.REPORT_GENERATION,
      `Exporting report ${reportId} as PDF for patient ${patientId}, examination ${examinationId}`,
      { reportId, patientId, examinationId, format: "pdf" }
    );

    setIsExportingPdf(true);

    try {
      const blob = await pdf(<ReportPdfDocument reportData={pdfReportData} />).toBlob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTitle = (report?.title || "NeoAi-LUS-Assistant").replace(/[^a-z0-9]+/gi, "-");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      link.href = downloadUrl;
      link.download = `${safeTitle}-${reportId}-${timestamp}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      completeAction(actionLog.id, "SUCCEEDED");
    } catch (error) {
      completeAction(actionLog.id, "FAILED");
    } finally {
      setIsExportingPdf(false);
    }
  }

  if (!report) {
    return (
      <section className="panel">
        <h2>Report not found</h2>
        <Link className="secondary-button" to="/query">
          Back to query
        </Link>
      </section>
    );
  }

  return (
    <div className="report-page">
      <div className="report-shell">
        <article className="report-document">
          <header className="report-hero">
            <div>
              <h1 className="report-title">{report.title}</h1>
            </div>
          </header>

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">1. Patient Information</h2>
              <div className="report-field-list">
                <div className="report-field-row">
                  <span className="report-field-label">Patient ID:</span>
                  <span className="report-field-value">{report.patientId}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Full Name:</span>
                  <span className="report-field-value">{patient?.name || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Date of Birth:</span>
                  <span className="report-field-value">{report.dateOfBirth || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Gestational Age:</span>
                  <span className="report-field-value">{report.gestationalAge || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Birth Weight:</span>
                  <span className="report-field-value">{report.birthWeight || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Postnatal Age:</span>
                  <span className="report-field-value">{report.postnatalAge || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Clinic (NICU):</span>
                  <span className="report-field-value">{report.clinic || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Bed Number:</span>
                  <span className="report-field-value">{report.bedNumber || "-"}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">Scan Date / Time:</span>
                  <span className="report-field-value">{report.reportDate}</span>
                </div>
                <div className="report-field-row">
                  <span className="report-field-label">AI Software Version (NeoAI LUS Assistant):</span>
                  <span className="report-field-value">{report.softwareVersion || "-"}</span>
                </div>
              </div>
            </section>

            <section className="report-card">
              <h2 className="report-card-title">2. Clinical Indication</h2>
              <div className="report-indication-line">
                {clinicalIndicationOptions.map((option) => (
                  <label className="report-check-option" key={option.id}>
                    <input
                      checked={selectedClinicalIndications.includes(option.id)}
                      onChange={() => handleClinicalIndicationToggle(option.id)}
                      type="checkbox"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
                <div className="report-check-option report-other-option">
                  <label className="report-check-toggle">
                    <input
                      checked={otherClinicalIndication.trim().length > 0}
                      onChange={(event) => {
                        if (!event.target.checked) {
                          setOtherClinicalIndication("");
                        }
                      }}
                      type="checkbox"
                    />
                    <span>Other:</span>
                  </label>
                  <input
                    className="report-other-input"
                    onChange={(event) => setOtherClinicalIndication(event.target.value)}
                    placeholder="Write here"
                    type="text"
                    value={otherClinicalIndication}
                  />
                </div>
              </div>
            </section>
          </section>

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">3. Selected Module Results by Frame</h2>
              <div className="report-region-grid report-region-grid-inline">
                {regionReportRows.map((row) => (
                  <article className="report-region-card" key={row.region}>
                    <div className="report-region-frame">
                      <img alt={`${row.region.toUpperCase()} selected frame`} src={row.image} />
                      <span className="report-region-overlay-label">
                        {row.region.toUpperCase()}{row.frameIndex !== null && row.frameIndex !== undefined ? ` (Frame #${row.frameIndex + 1})` : ""}
                      </span>
                    </div>
                    <div className="report-region-results">
                      <div className="report-module-block">
                        <h3 className="report-module-title">{moduleLabelMap["b-line"]}</h3>
                        <div className="report-table-wrap">
                          <table className="report-table report-module-table">
                            <tbody>
                              <tr>
                                <th>Metric</th>
                                <th>Value</th>
                              </tr>
                              <tr>
                                <td>Count</td>
                                <td>{row.bLineCount}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <div className="report-module-block">
                        <h3 className="report-module-title">{moduleLabelMap["rds-score"]}</h3>
                        <div className="report-table-wrap">
                          <table className="report-table report-module-table">
                            <tbody>
                              <tr>
                                <th>Metric</th>
                                <th>Value</th>
                              </tr>
                              <tr>
                                <td>Score</td>
                                <td>{row.regionScore}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>

          {isRdsSelected ? (
          <section className="report-table-card">
            <div className="report-card" style={{ background: "transparent", border: "none", paddingBottom: 0 }}>
              <h2 className="report-card-title">4. AI Disease Classification</h2>
            </div>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Diagnosis</th>
                    <th>Probability</th>
                  </tr>
                </thead>
                <tbody>
                  {diagnosisProbabilities.map((item) => (
                    <tr key={item.label}>
                      <td>{item.label}</td>
                      <td>{formatPercent(item.probability)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "12px 18px", display: "flex", justifyContent: "flex-end", background: "rgba(125, 211, 252, 0.05)", borderTop: "1px solid rgba(148, 197, 255, 0.1)" }}>
              <Link
                to={`/decision-tree/${reportId}`}
                state={location.state}
                className="report-button"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(125, 211, 252, 0.15)",
                  borderColor: "rgba(125, 211, 252, 0.35)",
                  color: "#7dd3fc"
                }}
              >
                🌳 Inspect LUS Decision Tree &amp; Probabilities
              </Link>
            </div>
          </section>
          ) : null}

          <section className="report-section-grid">
            <section className="report-card">
              <h2 className="report-card-title">{isRdsSelected ? "5. AI Clinical Report" : "4. AI Clinical Report"}</h2>
              <p className="report-section-copy">
                Automatic clinical assessment generated by NeoAI LUS Assistant:
              </p>
            </section>
          </section>

          <section className="report-footer-grid">
            <section className="report-card">
              <h2 className="report-card-title">{isRdsSelected ? "6. Clinical Assessment (Physician)" : "5. Clinical Assessment (Physician)"}</h2>
              <div className="report-assessment-block">
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Final Diagnosis</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setFinalDiagnosis(event.target.value)}
                    placeholder="Write final diagnosis"
                    rows="3"
                    value={finalDiagnosis}
                  />
                </label>
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Treatment / Recommendation</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setTreatmentRecommendation(event.target.value)}
                    placeholder="Write treatment or recommendation"
                    rows="3"
                    value={treatmentRecommendation}
                  />
                </label>
                <label className="report-assessment-row">
                  <span className="report-assessment-label">Follow-up Recommendation</span>
                  <textarea
                    className="report-assessment-input report-assessment-textarea"
                    onChange={(event) => setFollowUpRecommendation(event.target.value)}
                    placeholder="Write follow-up recommendation"
                    rows="3"
                    value={followUpRecommendation}
                  />
                </label>
              </div>
            </section>

            <section className="report-card report-approval">
              <h2 className="report-card-title">{isRdsSelected ? "7. Approval" : "6. Approval"}</h2>
              <div className="report-table-wrap">
                <table className="report-table report-approval-table">
                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Name</th>
                      <th>Signature</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Reporting Physician</td>
                      <td>{signedBy}</td>
                      <td className="report-signature-cell">________________</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="report-approval-note">
                <strong>Note:</strong> This report contains AI analysis generated by NeoAI LUS Assistant. Clinical decisions should be
                made based on physician evaluation.
              </p>
            </section>
          </section>

          <div className="report-actions report-actions-bottom">
            <div className="report-export-control">
              <select
                className="report-export-select"
                onChange={(event) => setExportFormat(event.target.value)}
                value={exportFormat}
              >
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
              </select>
              <button
                className="report-button primary"
                disabled={isExportingPdf || exportFormat === "docx"}
                type="button"
                onClick={exportFormat === "pdf" ? handleExportPdf : undefined}
              >
                {exportFormat === "pdf"
                  ? isExportingPdf
                    ? "Preparing PDF..."
                    : "Export"
                  : "DOCX Soon"}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
