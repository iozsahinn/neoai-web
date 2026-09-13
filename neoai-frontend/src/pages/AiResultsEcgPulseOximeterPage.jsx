import { useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography
} from "@mui/material";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getReportById } from "../services/mockApi";
import { ecgPulseOximeterReport } from "../data/mockData";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { logSimpleAction, ActionTypes, completeAction, failAction } from "../services/actionLogger";

export function AiResultsEcgPulseOximeterPage() {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const eventMapRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);

  const report = useMemo(() => {
    return getReportById(reportId) || ecgPulseOximeterReport;
  }, [reportId]);

  const [selectedEventIndex, setSelectedEventIndex] = useState(0);

  const mockEvents = [
    { time: "00:14:22", type: "Apnea & Bradycardia", spo2Drop: "94% → 82%", hrDrop: "135 → 88 bpm", duration: "26s", risk: "High" },
    { time: "00:38:05", type: "Transient Hypoxia", spo2Drop: "96% → 85%", hrDrop: "130 → 94 bpm", duration: "18s", risk: "Medium" },
    { time: "01:05:40", type: "Apnea & Reflex Brady", spo2Drop: "95% → 83%", hrDrop: "138 → 85 bpm", duration: "31s", risk: "High" }
  ];

  const activeEvent = mockEvents[selectedEventIndex] || mockEvents[0];

  const context = {
    patientId: report?.patientId || "PT-1001",
    examinationId: report?.examinationId || "EPO_Exam_1001",
    reportId: report?.id || "REP-EPO-3001"
  };

  const handleExportPdf = async () => {
    if (isExporting || !eventMapRef.current) return;
    setIsExporting(true);

    const actionLog = logSimpleAction(
      "Export Event Map PDF",
      ActionTypes.REPORT_GENERATION,
      `Exporting Synchronized ECG & SpO2 Event Map PDF for patient ${context.patientId}`,
      { patientId: context.patientId, examinationId: context.examinationId, eventTime: activeEvent.time }
    );

    try {
      const canvas = await html2canvas(eventMapRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Header overlay on PDF
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(56, 189, 248);
      pdf.text("NeoAI - Synchronized ECG & SpO2 Event Map Report", 12, 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Patient ID: ${context.patientId}  |  Exam ID: ${context.examinationId}  |  Event: ${activeEvent.time} (${activeEvent.type})  |  Date: ${new Date().toLocaleString()}`,
        12,
        20
      );

      const imgProps = pdf.getImageProperties(imgData);
      const contentWidth = pdfWidth - 24;
      const contentHeight = (imgProps.height * contentWidth) / imgProps.width;
      const startY = 24;

      if (startY + contentHeight > pdfHeight - 12) {
        const maxHeight = pdfHeight - startY - 12;
        const fitWidth = (imgProps.width * maxHeight) / imgProps.height;
        pdf.addImage(imgData, "PNG", (pdfWidth - fitWidth) / 2, startY, fitWidth, maxHeight);
      } else {
        pdf.addImage(imgData, "PNG", 12, startY, contentWidth, contentHeight);
      }

      const safePatient = (context.patientId || "PT-1001").replace(/[^a-zA-Z0-9_-]/g, "");
      const safeTime = (activeEvent.time || "00-00-00").replace(/:/g, "-");
      pdf.save(`ECG_SpO2_Event_Map_${safePatient}_${safeTime}.pdf`);

      if (actionLog?.id) completeAction(actionLog.id);
    } catch (error) {
      console.error("Error generating Event Map PDF:", error);
      if (actionLog?.id) failAction(actionLog.id, error?.message || "PDF generation error");
      alert("PDF indirilirken bir hata oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Stack spacing={3} className="page-container">
      <WorkflowSteps currentStep="results" context={context} />

      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
        <Button
          component={Link}
          to={`/ai-module-ecg-pulse-oximeter/${context.patientId}/${context.examinationId}`}
          startIcon={<ArrowBackRoundedIcon />}
          variant="outlined"
        >
          Back to AI Module
        </Button>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            startIcon={isExporting ? <CircularProgress size={18} color="inherit" /> : <PictureAsPdfRoundedIcon />}
            onClick={handleExportPdf}
            disabled={isExporting}
          >
            {isExporting ? "Preparing PDF..." : "Export PDF"}
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<DescriptionRoundedIcon />}
            onClick={() => navigate(`/report/${context.reportId}`)}
          >
            Create Final Clinical Report
          </Button>
        </Stack>
      </Stack>

      {/* Main Results Summary Header */}
      <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.9) 100%)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems="flex-start" spacing={3}>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="h4" fontWeight={700}>{report.title}</Typography>
              <Chip label={`AI Confidence: ${report.confidence}`} color="success" sx={{ fontWeight: 700 }} />
            </Stack>
            <Typography variant="body1" color="text.secondary">
              {report.summary}
            </Typography>
          </Box>
          <Card variant="outlined" sx={{ minWidth: 240, bg: "background.paper" }}>
            <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
              <Typography variant="caption" color="text.secondary">PATIENT & EXAMINATION</Typography>
              <Typography variant="body2" fontWeight={700}>Patient ID: {report.patientId}</Typography>
              <Typography variant="body2" fontWeight={700}>Exam ID: {report.examinationId}</Typography>
              <Typography variant="caption" color="text.secondary">Date: {report.reportDate}</Typography>
            </CardContent>
          </Card>
        </Stack>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Column: Synchronized Visual Event Plot */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper ref={eventMapRef} variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={2.5}>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={1.5}>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <MonitorHeartRoundedIcon color="primary" /> Synchronized ECG & SpO2 Event Map
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip label={`Selected Event at ${activeEvent.time}`} color="warning" size="small" />
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={isExporting ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfRoundedIcon />}
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    sx={{ fontWeight: 600, height: 28, textTransform: "none", fontSize: "0.8125rem", px: 1.5 }}
                  >
                    {isExporting ? "Preparing PDF..." : "Export PDF"}
                  </Button>
                </Stack>
              </Stack>

              {/* Event Selector Pills */}
              <Stack direction="row" spacing={1.5}>
                {mockEvents.map((evt, idx) => (
                  <Chip
                    key={evt.time}
                    label={`${evt.time} (${evt.type})`}
                    color={selectedEventIndex === idx ? "primary" : "default"}
                    onClick={() => setSelectedEventIndex(idx)}
                    sx={{ fontWeight: 600, cursor: "pointer" }}
                  />
                ))}
              </Stack>

              {/* Dual Wave Plot with Event Highlight */}
              <Box sx={{ position: "relative", border: "1px dashed rgba(255,255,255,0.2)", borderRadius: 2, p: 2, bg: "rgba(0,0,0,0.2)" }}>
                {/* Event Marker Overlay */}
                <Box sx={{ position: "absolute", left: "45%", top: 0, bottom: 0, width: "20%", bg: "rgba(239, 68, 68, 0.12)", borderLeft: "1.5px dashed #ef4444", borderRight: "1.5px dashed #ef4444", pointerEvents: "none" }}>
                  <Typography variant="caption" sx={{ color: "#ef4444", fontWeight: 700, p: 0.5, display: "block" }}>
                    Desaturation & Bradycardia Event Zone
                  </Typography>
                </Box>

                {/* Simulated Wave SVG */}
                <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700 }}>ECG Lead II (R-R Interval Prolongation: 1.12s)</Typography>
                <svg width="100%" height="80" viewBox="0 0 600 80">
                  <path d="M 0,40 Q 30,40 40,20 T 50,70 T 60,40 L 140,40 Q 170,40 180,20 T 190,70 T 200,40 L 320,40 Q 350,40 360,20 T 370,70 T 380,40 L 520,40 Q 550,40 560,20 T 570,70 T 580,40" fill="none" stroke="#38bdf8" strokeWidth="2" />
                </svg>

                <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700, mt: 1, display: "block" }}>SpO2 Pleth Wave & Desaturation Dip ({activeEvent.spo2Drop})</Typography>
                <svg width="100%" height="80" viewBox="0 0 600 80">
                  <path d="M 0,20 Q 100,20 200,22 Q 270,65 340,60 Q 420,25 600,20" fill="none" stroke="#4ade80" strokeWidth="2" />
                </svg>
              </Box>

              {/* Event Metrics Detail */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">SpO2 Drop</Typography>
                    <Typography variant="body1" fontWeight={700} color="error">{activeEvent.spo2Drop}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">Heart Rate Drop</Typography>
                    <Typography variant="body1" fontWeight={700} color="info.main">{activeEvent.hrDrop}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">Duration</Typography>
                    <Typography variant="body1" fontWeight={700}>{activeEvent.duration}</Typography>
                  </Paper>
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Paper variant="outlined" sx={{ p: 1.5, textAlign: "center" }}>
                    <Typography variant="caption" color="text.secondary">Risk Severity</Typography>
                    <Typography variant="body1" fontWeight={700} color="warning.main">{activeEvent.risk}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column: Key Findings & Interpretation */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Stack spacing={2.5}>
            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                Key Multi-Modal Findings
              </Typography>
              <Stack spacing={1.5}>
                {report.findings?.map((finding, idx) => (
                  <Stack key={idx} direction="row" spacing={1.5} alignItems="flex-start">
                    <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 20, mt: 0.2 }} />
                    <Typography variant="body2">{finding}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>

            <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                <WarningAmberRoundedIcon color="warning" /> Clinical Interpretation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {report.clinicalInterpretation}
              </Typography>
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="subtitle2" fontWeight={700}>Recommendation</Typography>
              <Typography variant="body2" color="text.secondary">
                {report.recommendation}
              </Typography>
            </Paper>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

