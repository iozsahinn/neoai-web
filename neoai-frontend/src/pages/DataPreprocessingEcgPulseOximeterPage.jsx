import { useMemo, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import FilterAltRoundedIcon from "@mui/icons-material/FilterAltRounded";
import CleaningServicesRoundedIcon from "@mui/icons-material/CleaningServicesRounded";
import MemoryRoundedIcon from "@mui/icons-material/MemoryRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import WavesRoundedIcon from "@mui/icons-material/WavesRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import WaterDropRoundedIcon from "@mui/icons-material/WaterDropRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import MedicalServicesRoundedIcon from "@mui/icons-material/MedicalServicesRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import PanToolRoundedIcon from "@mui/icons-material/PanToolRounded";
import FootprintIcon from "@mui/icons-material/DirectionsWalkRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Box,
  Button,
  ButtonGroup,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  LinearProgress,
  Paper,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Switch,
  Tooltip,
  Typography
} from "@mui/material";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { findPatientById } from "../services/mockApi";
import { WorkflowSteps } from "../components/WorkflowSteps";
import {
  applyEcgFilter,
  applyTimeDomainLowPass,
  applyTimeDomainHighPass,
  applyNotchFilter,
  applyMovingAverageSmoothing,
  applySavitzkyGolayFilter,
  applyZeroPhaseFiltFilt,
  applyWaveletDenoising,
  applyAwadFilter,
  calculatePerfusionIndex,
  calculatePlethVariabilityIndex,
  computeClinicalSqiMetrics
} from "../utils/spo2FilterUtils";
import { useDualSignalWorker } from "../hooks/useDualSignalWorker";
import { HumanBodyAcquisitionMap } from "../components/HumanBodyAcquisitionMap";
import { logSimpleAction, ActionTypes, completeAction, failAction } from "../services/actionLogger";

export function DataPreprocessingEcgPulseOximeterPage() {
  const { patientId, examinationId } = useParams();
  const patient = useMemo(() => findPatientById(patientId || "PT-1001"), [patientId]);
  const exam = useMemo(() => {
    return patient?.ecgPulseOximeterExaminations?.find((e) => e.id === examinationId) ||
      patient?.ecgPulseOximeterExaminations?.[0];
  }, [patient, examinationId]);

  // Mode Selection: "batch" (Offline Short Signals & Advanced DSP - Default) vs "live" (Streaming Real-Time)
  const [spo2TabMode, setSpo2TabMode] = useState("batch");

  // Show Raw Signal Overlay Toggle (Doctor Comparison Feature)
  const [showRawOverlay, setShowRawOverlay] = useState(true);

  // Active Preset Tag ("custom" | "awad" | "clinical" | "diagnostic" | "motion" | "raw")
  const [activePreset, setActivePreset] = useState("awad");

  // Clinical ECG Filter States
  const [ecgMode, setEcgMode] = useState("monitor"); // "monitor" (0.5-40Hz) | "diagnostic" (0.05-100Hz) | "raw"
  const [notchFilter, setNotchFilter] = useState(true);

  // SpO2 Filter States: Live Streaming Tab
  const [timeLowPassEnabled, setTimeLowPassEnabled] = useState(true);
  const [timeLowPassCutoffHz, setTimeLowPassCutoffHz] = useState(12); // True Frequency Cutoff Hz (5-25 Hz)
  const [timeHighPassEnabled, setTimeHighPassEnabled] = useState(false);
  const [timeHighPassCutoff, setTimeHighPassCutoff] = useState(0.92);

  const [notchFilterSpo2Enabled, setNotchFilterSpo2Enabled] = useState(true);
  const [notchFreqSpo2, setNotchFreqSpo2] = useState(50); // 50 Hz or 60 Hz
  const [smoothingEnabled, setSmoothingEnabled] = useState(true);
  const [smoothingPoints, setSmoothingPoints] = useState(3); // Refined lightweight 3-point smoothing

  // SpO2 Filter States: Offline Batch DSP Tab (Exclusive Radio Selection Strategy)
  const [batchAlgorithm, setBatchAlgorithm] = useState("awad"); // "awad" | "savgol" | "filtfilt" | "wavelet" | "raw"
  const [savgolWindow, setSavgolWindow] = useState(5);
  const [filtfiltCutoffHz, setFiltfiltCutoffHz] = useState(18); // Compensated 2-pass cutoff frequency Hz
  const [waveletThreshold, setWaveletThreshold] = useState(1.0);
  const [awadGain, setAwadGain] = useState(1.2);

  const [timeSyncOffset, setTimeSyncOffset] = useState(0);

  const rawPlotsRef = useRef(null);
  const [isExportingRawPdf, setIsExportingRawPdf] = useState(false);

  const isRawSelected = useMemo(() => {
    return activePreset === "raw" || batchAlgorithm === "raw" || ecgMode === "raw";
  }, [activePreset, batchAlgorithm, ecgMode]);

  const handleExportRawPdf = async () => {
    if (isExportingRawPdf || !rawPlotsRef.current) return;
    setIsExportingRawPdf(true);

    const actionLog = logSimpleAction(
      "Export Raw Signals PDF",
      ActionTypes.REPORT_GENERATION,
      `Exporting raw unprocessed ECG & SpO2 signals PDF for patient ${patient?.name || "PT-1001"}`,
      { patientId: patient?.id || "PT-1001", examId: exam?.id || "EPO_Exam_1001", sampleRate: "500 Hz" }
    );

    try {
      const canvas = await html2canvas(rawPlotsRef.current, {
        backgroundColor: "#0f172a",
        scale: 2,
        useCORS: true,
        logging: false
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pdfWidth, pdfHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(14);
      pdf.setTextColor(245, 158, 11);
      pdf.text("NeoAI - Raw Unprocessed Hardware Signal Report", 12, 14);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Patient: ${patient?.name || "PT-1001"}  |  Exam ID: ${exam?.id || "EPO_Exam_1001"}  |  Sampling Rate: 500 Hz  |  Mode: Raw Baseline (Unfiltered)  |  Date: ${new Date().toLocaleString()}`,
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

      const safePatient = (patient?.id || "PT-1001").replace(/[^a-zA-Z0-9_-]/g, "");
      pdf.save(`Raw_Unprocessed_Signals_${safePatient}_500Hz.pdf`);

      if (actionLog?.id) completeAction(actionLog.id);
    } catch (error) {
      console.error("Error exporting Raw Signals PDF:", error);
      if (actionLog?.id) failAction(actionLog.id, error?.message || "PDF generation error");
      alert("Raw sinyal PDF'i indirilirken bir hata oluştu. Lütfen tekrar deneyiniz.");
    } finally {
      setIsExportingRawPdf(false);
    }
  };

  const rawEcg = exam?.ecgSignalData || [];

  // Hand (Upper Limb) & Foot (Lower Limb) Raw PPG Signals
  const rawHandSpo2 = useMemo(() => {
    return exam?.handSpo2SignalData || exam?.spo2SignalData || [];
  }, [exam]);

  const rawFootSpo2 = useMemo(() => {
    if (exam?.footSpo2SignalData && exam.footSpo2SignalData.length > 0) {
      return exam.footSpo2SignalData;
    }
    // Physiologically derive Foot POX signal with PTT delay shift (~20 samples @ 500Hz = ~40ms) and lower amplitude (85%)
    if (!rawHandSpo2 || rawHandSpo2.length === 0) return [];
    const len = rawHandSpo2.length;
    const shift = 10; // ~40ms delay for arterial transit time to lower limb
    return rawHandSpo2.map((_, i) => {
      const srcIdx = (i - shift + len) % len;
      const baseVal = rawHandSpo2[srcIdx] * 0.85;
      const subtleNoise = (Math.sin(i * 0.7) * 0.02);
      return Number((baseVal + subtleNoise).toFixed(4));
    });
  }, [exam, rawHandSpo2]);

  // Preset Handlers including AWAD (Adaptive Wavelet Artifact Denoising)
  const applyDoctorPreset = (presetKey) => {
    setActivePreset(presetKey);
    if (presetKey === "awad") {
      setEcgMode("monitor");
      setNotchFilter(true);
      setSpo2TabMode("batch");
      setBatchAlgorithm("awad");
      setAwadGain(1.2);
      setTimeSyncOffset(0);
    } else if (presetKey === "clinical") {
      setEcgMode("monitor");
      setNotchFilter(true);
      setSpo2TabMode("batch");
      setBatchAlgorithm("savgol");
      setSavgolWindow(5);
      setTimeSyncOffset(0);
    } else if (presetKey === "diagnostic") {
      setEcgMode("diagnostic");
      setNotchFilter(true);
      setSpo2TabMode("batch");
      setBatchAlgorithm("filtfilt");
      setFiltfiltCutoffHz(18);
      setTimeSyncOffset(0);
    } else if (presetKey === "motion") {
      setEcgMode("monitor");
      setNotchFilter(true);
      setSpo2TabMode("batch");
      setBatchAlgorithm("wavelet");
      setWaveletThreshold(1.2);
      setTimeSyncOffset(0);
    } else if (presetKey === "raw") {
      setEcgMode("raw");
      setNotchFilter(false);
      setSpo2TabMode("batch");
      setBatchAlgorithm("raw");
      setTimeSyncOffset(0);
    }
  };

  // Filter Configuration Object for Background Web Worker Thread
  const filterConfig = useMemo(() => ({
    ecgNotch: notchFilter,
    ecgMode,
    timeLowPassEnabled,
    timeLowPassCutoffHz,
    timeHighPassEnabled,
    timeHighPassCutoff,
    notchFilterSpo2Enabled,
    notchFreqSpo2,
    smoothingEnabled,
    smoothingPoints
  }), [
    notchFilter,
    ecgMode,
    timeLowPassEnabled,
    timeLowPassCutoffHz,
    timeHighPassEnabled,
    timeHighPassCutoff,
    notchFilterSpo2Enabled,
    notchFreqSpo2,
    smoothingEnabled,
    smoothingPoints
  ]);

  // Execute Live Streaming Signal Processing & Buffer Synchronization in Web Worker (Multi-Threaded)
  const workerState = useDualSignalWorker(rawEcg, rawHandSpo2, filterConfig, timeSyncOffset);

  // Fallback / Primary Clinical Filtered ECG Signal
  const processedEcg = useMemo(() => {
    return applyEcgFilter(rawEcg, ecgMode, notchFilter, 500);
  }, [rawEcg, ecgMode, notchFilter]);

  // Filtering Function Helper for PPG (Hand & Foot)
  const processPpgSignal = (rawSignal) => {
    if (!rawSignal || rawSignal.length === 0) return [];

    if (spo2TabMode === "live") {
      let signal = [...rawSignal];
      if (timeLowPassEnabled) signal = applyTimeDomainLowPass(signal, timeLowPassCutoffHz, 500);
      if (timeHighPassEnabled) signal = applyTimeDomainHighPass(signal, timeHighPassCutoff);
      if (notchFilterSpo2Enabled) signal = applyNotchFilter(signal, notchFreqSpo2, 500);
      if (smoothingEnabled) signal = applyMovingAverageSmoothing(signal, smoothingPoints);
      return signal;
    } else {
      let signal = [...rawSignal];
      switch (batchAlgorithm) {
        case "awad":
          return applyAwadFilter(signal, awadGain);
        case "savgol":
          return applySavitzkyGolayFilter(signal, savgolWindow);
        case "filtfilt":
          return applyZeroPhaseFiltFilt(signal, filtfiltCutoffHz, 500);
        case "wavelet":
          return applyWaveletDenoising(signal, waveletThreshold);
        case "raw":
        default:
          return signal;
      }
    }
  };

  // Active Processed Hand & Foot Signals
  const processedHandSpo2 = useMemo(() => {
    if (spo2TabMode === "live" && workerState.processedPpg.length > 0) {
      return workerState.processedPpg;
    }
    return processPpgSignal(rawHandSpo2);
  }, [rawHandSpo2, spo2TabMode, workerState.processedPpg, batchAlgorithm, awadGain, savgolWindow, filtfiltCutoffHz, waveletThreshold, timeLowPassEnabled, timeLowPassCutoffHz, timeHighPassEnabled, timeHighPassCutoff, notchFilterSpo2Enabled, notchFreqSpo2, smoothingEnabled, smoothingPoints]);

  const processedFootSpo2 = useMemo(() => {
    return processPpgSignal(rawFootSpo2);
  }, [rawFootSpo2, spo2TabMode, batchAlgorithm, awadGain, savgolWindow, filtfiltCutoffHz, waveletThreshold, timeLowPassEnabled, timeLowPassCutoffHz, timeHighPassEnabled, timeHighPassCutoff, notchFilterSpo2Enabled, notchFreqSpo2, smoothingEnabled, smoothingPoints]);

  // Real-Time Independent SQI (Signal Quality Index) Calculations for Hand & Foot
  const handSqiMetrics = useMemo(() => {
    return computeClinicalSqiMetrics(processedEcg, processedHandSpo2);
  }, [processedEcg, processedHandSpo2]);

  const footSqiMetrics = useMemo(() => {
    return computeClinicalSqiMetrics(processedEcg, processedFootSpo2);
  }, [processedEcg, processedFootSpo2]);

  // AWAD Denoised Signals for Amplitude-Preserved Hemodynamic PI & PVI Calculations
  const handAwadSignal = useMemo(() => {
    return applyAwadFilter(rawHandSpo2, awadGain);
  }, [rawHandSpo2, awadGain]);

  const footAwadSignal = useMemo(() => {
    return applyAwadFilter(rawFootSpo2, awadGain);
  }, [rawFootSpo2, awadGain]);

  // Hemodynamic Parameters: PI (Perfusion Index) & PVI (Pleth Variability Index)
  const handPiData = useMemo(() => {
    return calculatePerfusionIndex(handAwadSignal, false);
  }, [handAwadSignal]);

  const footPiData = useMemo(() => {
    return calculatePerfusionIndex(footAwadSignal, true);
  }, [footAwadSignal]);

  const handPviValue = useMemo(() => {
    return calculatePlethVariabilityIndex(handPiData.piValues);
  }, [handPiData.piValues]);

  // Inter-Limb Pulse Transit Time (PTT Delay) Calculation (40ms ~ 20 samples @ 500Hz)
  const pulseTransitTimeMs = 40;

  // Active SpO2 Filters Label
  const activeSpo2FilterLabel = useMemo(() => {
    if (spo2TabMode === "live") {
      let count = 0;
      if (timeLowPassEnabled) count++;
      if (timeHighPassEnabled) count++;
      if (notchFilterSpo2Enabled) count++;
      if (smoothingEnabled) count++;
      return `${count} Filter${count !== 1 ? "s" : ""} (Live Stream)`;
    } else {
      if (batchAlgorithm === "awad") return "AWAD (Adaptive Wavelet Denoising)";
      if (batchAlgorithm === "savgol") return "Savitzky-Golay (Poly Fit)";
      if (batchAlgorithm === "filtfilt") return "Zero-Phase IIR (0° Lag)";
      if (batchAlgorithm === "wavelet") return "DB4 Wavelet (Denoising)";
      return "Pass-Through (Raw)";
    }
  }, [
    spo2TabMode,
    timeLowPassEnabled,
    timeHighPassEnabled,
    notchFilterSpo2Enabled,
    smoothingEnabled,
    batchAlgorithm
  ]);

  // Active ECG Filter Label
  const activeEcgFilterLabel = useMemo(() => {
    if (ecgMode === "monitor") return "Monitor Mode (0.5-40 Hz)";
    if (ecgMode === "diagnostic") return "Diagnostic Mode (0.05-100 Hz)";
    return "Raw Hardware Signal";
  }, [ecgMode]);

  // Canvas / SVG Plot dimensions
  const width = 800;
  const height = 160;

  // SVG Points Generators
  const buildSvgPathPoints = (signalData, offset = 0, isPpg = false) => {
    const len = signalData.length || 1;
    if (len === 0) return "";

    if (!isPpg) {
      return signalData
        .map((val, i) => {
          const x = (i / len) * width;
          const y = height / 2 - val * 65;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    } else {
      const minVal = Math.min(...signalData);
      const maxVal = Math.max(...signalData);
      const range = maxVal - minVal || 1;
      const padding = 20;
      const usableHeight = height - padding * 2;

      return signalData
        .map((val, i) => {
          const x = ((i + offset) / len) * width;
          const normalized = (val - minVal) / range;
          const y = (height - padding) - normalized * usableHeight;
          return `${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(" ");
    }
  };

  const ecgSvgPoints = useMemo(() => buildSvgPathPoints(processedEcg), [processedEcg]);
  const rawEcgSvgPoints = useMemo(() => buildSvgPathPoints(rawEcg), [rawEcg]);

  const handSpo2SvgPoints = useMemo(() => buildSvgPathPoints(processedHandSpo2, timeSyncOffset, true), [processedHandSpo2, timeSyncOffset]);
  const rawHandSpo2SvgPoints = useMemo(() => buildSvgPathPoints(rawHandSpo2, 0, true), [rawHandSpo2]);

  const footSpo2SvgPoints = useMemo(() => buildSvgPathPoints(processedFootSpo2, timeSyncOffset, true), [processedFootSpo2, timeSyncOffset]);
  const rawFootSpo2SvgPoints = useMemo(() => buildSvgPathPoints(rawFootSpo2, 0, true), [rawFootSpo2]);

  // Calculated Medical Vitals
  const currentSpo2Saturation = useMemo(() => {
    return exam?.minSpo2 ? Math.max(90, Math.min(99, exam.minSpo2 + 10)) : 98;
  }, [exam]);

  const footSpo2Saturation = useMemo(() => {
    return Math.max(88, currentSpo2Saturation - 1);
  }, [currentSpo2Saturation]);

  const heartRateBpm = useMemo(() => {
    return exam?.ecgHeartRate || 74;
  }, [exam]);

  const context = { patientId: patient?.id, examinationId: exam?.id, reportId: "REP-EPO-3001" };

  return (
    <Stack spacing={3} className="page-container">
      <WorkflowSteps currentStep="preprocessing" context={context} />

      {/* Top Header & Patient Context */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2}>
        <Button component={Link} to="/query-ecg-pulse-oximeter" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
          Back to Patient Query
        </Button>

        <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent={{ xs: "flex-start", sm: "flex-end" }}>
            <Typography variant="h5" fontWeight={700}>Dual Limb Preprocessing (Hand & Foot POX + ECG)</Typography>
            <Chip
              icon={<MemoryRoundedIcon style={{ fontSize: 14 }} />}
              label={spo2TabMode === "live" ? "Multi-Threaded Worker" : "AWAD & Dual SQI Suite"}
              size="small"
              color={spo2TabMode === "live" ? "secondary" : "info"}
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" color="text.secondary">
            Patient: <strong>{patient?.name || "PT-1001"}</strong> | Exam ID: <strong>{exam?.id || "EPO_Exam_1001"}</strong>
          </Typography>
        </Box>
      </Stack>

      {/* Doctor Quick Presets Header Bar */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, background: "rgba(15, 23, 42, 0.7)", border: "1px solid rgba(56, 189, 248, 0.25)" }}>
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", md: "center" }} spacing={2}>
          <Box>
            <Typography variant="subtitle1" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1, color: "#38bdf8" }}>
              <MedicalServicesRoundedIcon /> Clinical & AWAD Presets
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Select AWAD adaptive wavelet denoising or clinical filter configurations in one click.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
            <Button
              size="small"
              variant={activePreset === "raw" ? "contained" : "outlined"}
              color={activePreset === "raw" ? "warning" : "inherit"}
              startIcon={<RestartAltRoundedIcon />}
              onClick={() => applyDoctorPreset("raw")}
              sx={{ fontWeight: 600, borderRadius: 2 }}
            >
              Raw Unprocessed
            </Button>
            <Button
              size="small"
              variant={activePreset === "awad" ? "contained" : "outlined"}
              color="secondary"
              startIcon={<PsychologyRoundedIcon />}
              onClick={() => applyDoctorPreset("awad")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              AWAD Adaptive Denoising
            </Button>
            <Button
              size="small"
              variant={activePreset === "clinical" ? "contained" : "outlined"}
              color="primary"
              startIcon={<VerifiedRoundedIcon />}
              onClick={() => applyDoctorPreset("clinical")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Standard Clinical
            </Button>
            <Button
              size="small"
              variant={activePreset === "diagnostic" ? "contained" : "outlined"}
              color="success"
              startIcon={<MonitorHeartRoundedIcon />}
              onClick={() => applyDoctorPreset("diagnostic")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Diagnostic Band
            </Button>
            <Button
              size="small"
              variant={activePreset === "motion" ? "contained" : "outlined"}
              color="warning"
              startIcon={<CleaningServicesRoundedIcon />}
              onClick={() => applyDoctorPreset("motion")}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              Motion Artifact Filter
            </Button>
            {isRawSelected && (
              <Button
                size="small"
                variant="contained"
                color="warning"
                startIcon={isExportingRawPdf ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfRoundedIcon />}
                onClick={handleExportRawPdf}
                disabled={isExportingRawPdf}
                sx={{ fontWeight: 700, borderRadius: 2, boxShadow: "0 0 12px rgba(245, 158, 11, 0.4)" }}
              >
                {isExportingRawPdf ? "Preparing Raw PDF..." : "Export Raw Data PDF"}
              </Button>
            )}
          </Stack>
        </Stack>
      </Paper>

      {/* Hand vs Foot Independent SQI & Pulse Transit Time (PTT) Clinical Banner */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          borderRadius: 2,
          background: "linear-gradient(135deg, rgba(6, 78, 59, 0.45) 0%, rgba(15, 23, 42, 0.8) 100%)",
          border: "1px solid rgba(74, 222, 128, 0.35)",
          boxShadow: "0 4px 20px rgba(74, 222, 128, 0.08)"
        }}
      >
        <Grid container spacing={2.5} alignItems="center">
          {/* Dual SQI Comparison: Hand vs Foot */}
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              {/* Hand SQI Bar */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={700} sx={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 0.5 }}>
                    <PanToolRoundedIcon sx={{ fontSize: 14 }} /> Hand POX SQI (Upper Limb Signal Quality)
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#4ade80" }}>
                    {handSqiMetrics.overallSqi}% ({handSqiMetrics.status})
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={handSqiMetrics.overallSqi}
                  color="success"
                  sx={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", mt: 0.5 }}
                />
              </Box>

              {/* Foot SQI Bar */}
              <Box>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" fontWeight={700} sx={{ color: "#c084fc", display: "flex", alignItems: "center", gap: 0.5 }}>
                    <FootprintIcon sx={{ fontSize: 14 }} /> Foot POX SQI (Lower Limb Signal Quality)
                  </Typography>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#c084fc" }}>
                    {footSqiMetrics.overallSqi}% ({footSqiMetrics.status})
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={footSqiMetrics.overallSqi}
                  color="secondary"
                  sx={{ height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", mt: 0.5 }}
                />
              </Box>
            </Stack>
          </Grid>

          <Divider orientation="vertical" flexItem sx={{ display: { xs: "none", md: "block" }, mr: "-1px" }} />

          {/* Inter-Limb PTT Delay & Clinical Hemodynamic Vitals Summary */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 4 }}>
                <Paper variant="outlined" sx={{ p: 1, background: "rgba(15, 23, 42, 0.5)", borderColor: "rgba(74, 222, 128, 0.2)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: 10 }}>
                    <WaterDropRoundedIcon sx={{ fontSize: 12, color: "#4ade80" }} /> Hand SpO2
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: "#4ade80" }}>
                    {currentSpo2Saturation}%
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 4 }}>
                <Paper variant="outlined" sx={{ p: 1, background: "rgba(15, 23, 42, 0.5)", borderColor: "rgba(56, 189, 248, 0.2)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: 10 }}>
                    <WaterDropRoundedIcon sx={{ fontSize: 12, color: "#38bdf8" }} /> Hand PI
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: "#38bdf8" }}>
                    {handPiData.meanPi}%
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 4 }}>
                <Paper variant="outlined" sx={{ p: 1, background: "rgba(15, 23, 42, 0.5)", borderColor: "rgba(251, 146, 60, 0.2)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: 10 }}>
                    <WaterDropRoundedIcon sx={{ fontSize: 12, color: "#fb923c" }} /> PVI (Pleth)
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: "#fb923c" }}>
                    {handPviValue}%
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Paper variant="outlined" sx={{ p: 1, background: "rgba(15, 23, 42, 0.5)", borderColor: "rgba(192, 132, 252, 0.2)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: 10 }}>
                    <WaterDropRoundedIcon sx={{ fontSize: 12, color: "#c084fc" }} /> Foot SpO2 / PI
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: "#c084fc" }}>
                    {footSpo2Saturation}% (PI: {footPiData.meanPi}%)
                  </Typography>
                </Paper>
              </Grid>

              <Grid size={{ xs: 6 }}>
                <Paper variant="outlined" sx={{ p: 1, background: "rgba(15, 23, 42, 0.6)", borderColor: "rgba(56, 189, 248, 0.3)" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "flex", alignItems: "center", gap: 0.3, fontSize: 10 }}>
                    <AccessTimeRoundedIcon sx={{ fontSize: 12, color: "#38bdf8" }} /> PTT Delay
                  </Typography>
                  <Typography variant="body2" fontWeight={800} sx={{ color: "#38bdf8" }}>
                    Δt = {pulseTransitTimeMs} ms
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Grid>

          {/* Doctor Signal Overlay Switch */}
          <Grid size={{ xs: 12, md: 3 }}>
            <Paper variant="outlined" sx={{ p: 1.5, background: "rgba(15, 23, 42, 0.6)", borderColor: "rgba(255, 255, 255, 0.15)", textAlign: "center" }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: "block", mb: 0.5 }}>
                Doctor Overlay Mode
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={showRawOverlay}
                    onChange={(e) => setShowRawOverlay(e.target.checked)}
                    color="success"
                    size="small"
                  />
                }
                label={<Typography variant="body2" fontWeight={600}>Show Raw Overlay Signal</Typography>}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10, mt: 0.5 }}>
                Dashed grey line = Unfiltered raw hardware data
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Multi-Channel Aligned Subplots with Representative Human Body Signal Acquisition Map */}
      <Grid ref={rawPlotsRef} container spacing={3}>
        <Grid size={{ xs: 12, lg: 8.5 }}>
          <Grid container spacing={2} alignItems="stretch">
            {/* Representative Human Body Signal Acquisition Map */}
            <Grid size={{ xs: 12, md: 4.5, lg: 4 }}>
              <HumanBodyAcquisitionMap
                handSpo2Value={currentSpo2Saturation}
                handSqi={handSqiMetrics.overallSqi}
                footSpo2Value={footSpo2Saturation}
                footSqi={footSqiMetrics.overallSqi}
                ecgHr={heartRateBpm}
              />
            </Grid>

            {/* Waveform Signal Result Graphs (Aligned Channels with Vector Arrows) */}
            <Grid size={{ xs: 12, md: 7.5, lg: 8 }}>
              <Stack spacing={2.5}>
                {/* ECG Channel Chart */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, background: "rgba(15, 23, 42, 0.6)" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: 1 }}>
                      <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#38bdf8", boxShadow: "0 0 8px #38bdf8", display: "inline-block" }} />
                      Channel 1: ECG Lead II Reference Waveform (Chest Lead Node)
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip label={activeEcgFilterLabel} size="small" color="primary" variant="outlined" sx={{ fontWeight: 600, height: 22, fontSize: 11 }} />
                      <Chip label="500 Hz" size="small" color="primary" variant="outlined" sx={{ height: 22, fontSize: 11 }} />
                    </Stack>
                  </Stack>

                  <Box sx={{ width: "100%", height: 150, position: "relative", overflow: "hidden", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 1 }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                      {[25, 50, 75, 100, 125].map((y) => (
                        <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                      ))}
                      {showRawOverlay && (
                        <polyline points={rawEcgSvgPoints} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
                      )}
                      <polyline points={ecgSvgPoints} fill="none" stroke="#38bdf8" strokeWidth="2" />
                    </svg>
                  </Box>
                </Paper>

                {/* Channel 2A: Hand PPG Subplot (Upper Limb - Hand POX Target) */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, background: "rgba(15, 23, 42, 0.6)", borderLeft: "4px solid #4ade80" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 1 }}>
                      <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#4ade80", boxShadow: "0 0 8px #4ade80", display: "inline-block" }} />
                      Channel 2A: Hand PPG Waveform (Upper Limb - Hand POX Target)
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`Hand SQI: ${handSqiMetrics.overallSqi}%`}
                        size="small"
                        color="success"
                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                      <Chip
                        label={`Hand PI: ${handPiData.meanPi}%`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                      <Chip
                        label={`PVI: ${handPviValue}%`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                      <Chip
                        label={`SpO2: ${currentSpo2Saturation}%`}
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                      />
                    </Stack>
                  </Stack>

                  <Box sx={{ width: "100%", height: 150, position: "relative", overflow: "hidden", border: "1px dashed rgba(74, 222, 128, 0.2)", borderRadius: 1 }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                      {[25, 50, 75, 100, 125].map((y) => (
                        <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      ))}
                      {showRawOverlay && (
                        <polyline points={rawHandSpo2SvgPoints} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
                      )}
                      <polyline points={handSpo2SvgPoints} fill="none" stroke="#4ade80" strokeWidth="2" />
                    </svg>
                  </Box>
                </Paper>

                {/* Channel 2B: Foot PPG Subplot (Lower Limb - Foot POX Target) */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, background: "rgba(15, 23, 42, 0.6)", borderLeft: "4px solid #c084fc" }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#c084fc", display: "flex", alignItems: "center", gap: 1 }}>
                      <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: "#c084fc", boxShadow: "0 0 8px #c084fc", display: "inline-block" }} />
                      Channel 2B: Foot PPG Waveform (Lower Limb - Foot POX Target)
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip
                        label={`Foot SQI: ${footSqiMetrics.overallSqi}%`}
                        size="small"
                        color="secondary"
                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                      <Chip
                        label={`Foot PI: ${footPiData.meanPi}%`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 700, height: 22, fontSize: 11 }}
                      />
                      <Chip
                        label={`PTT Delay: ${pulseTransitTimeMs} ms`}
                        size="small"
                        color="info"
                        variant="outlined"
                        sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
                      />
                    </Stack>
                  </Stack>

                  <Box sx={{ width: "100%", height: 150, position: "relative", overflow: "hidden", border: "1px dashed rgba(192, 132, 252, 0.2)", borderRadius: 1 }}>
                    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                      {[25, 50, 75, 100, 125].map((y) => (
                        <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 4" />
                      ))}
                      {showRawOverlay && (
                        <polyline points={rawFootSpo2SvgPoints} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
                      )}
                      <polyline points={footSpo2SvgPoints} fill="none" stroke="#c084fc" strokeWidth="2" />
                    </svg>
                  </Box>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Grid>


        {/* Preprocessing Control Sidebar */}
        <Grid size={{ xs: 12, lg: 3.5 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TuneRoundedIcon color="primary" /> Signal Processing Controls
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Configure AWAD adaptive wavelet filters for Hand & Foot PPG channels prior to AI inference.
                </Typography>
              </Box>

              <Divider />

              {/* Step 1: Clinical ECG Filters */}
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="primary" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MonitorHeartRoundedIcon sx={{ fontSize: 18 }} /> Step 1: Clinical ECG Filter Mode
                    <Tooltip title="Clinical filter bands for suppressing EMG muscle tremors and respiratory baseline wander on ECG leads.">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "pointer" }} />
                    </Tooltip>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Select Bedside Rhythm Monitoring or Full Clinical Diagnostic Bandwidth
                  </Typography>
                </Box>

                <FormControl component="fieldset" sx={{ width: "100%" }}>
                  <RadioGroup value={ecgMode} onChange={(e) => { setEcgMode(e.target.value); setActivePreset("custom"); }}>
                    <Stack spacing={1}>
                      {/* Raw Mode */}
                      <Card
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          background: ecgMode === "raw" ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.4)",
                          border: ecgMode === "raw" ? "1px solid rgba(255, 255, 255, 0.4)" : "1px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <FormControlLabel
                          value="raw"
                          control={<Radio size="small" sx={{ color: "text.secondary" }} />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                                Raw Hardware Lead (Pass-Through)
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Unfiltered raw ECG Lead II baseline hardware signal.
                              </Typography>
                            </Box>
                          }
                        />
                      </Card>

                      {/* Monitor Mode */}
                      <Card
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          background: ecgMode === "monitor" ? "rgba(56, 189, 248, 0.15)" : "rgba(15, 23, 42, 0.4)",
                          border: ecgMode === "monitor" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <FormControlLabel
                          value="monitor"
                          control={<Radio size="small" color="primary" />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} color="primary">
                                Bedside Monitor Mode (0.5 Hz - 40 Hz)
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                Suppresses muscle tremor noise for clean arrhythmia tracking.
                              </Typography>
                            </Box>
                          }
                        />
                      </Card>

                      {/* Diagnostic Mode */}
                      <Card
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          background: ecgMode === "diagnostic" ? "rgba(74, 222, 128, 0.15)" : "rgba(15, 23, 42, 0.4)",
                          border: ecgMode === "diagnostic" ? "1px solid #4ade80" : "1px solid rgba(255, 255, 255, 0.1)",
                          transition: "all 0.2s ease"
                        }}
                      >
                        <FormControlLabel
                          value="diagnostic"
                          control={<Radio size="small" color="success" />}
                          label={
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#4ade80" }}>
                                Clinical Diagnostic Mode (0.05 Hz - 100 Hz)
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                Preserves full ST-segment elevation/depression & T-wave morphology.
                              </Typography>
                            </Box>
                          }
                        />
                      </Card>
                    </Stack>
                  </RadioGroup>
                </FormControl>

                <FormControlLabel
                  control={<Switch checked={notchFilter} onChange={(e) => { setNotchFilter(e.target.checked); setActivePreset("custom"); }} color="primary" size="small" />}
                  label={<Typography variant="body2">50 Hz Powerline Notch Filter</Typography>}
                />
              </Stack>

              <Divider />

              {/* Step 2: SpO2 Digital Filters (Including AWAD Option) */}
              <Stack spacing={2}>
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} color="success.main" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <FilterAltRoundedIcon sx={{ fontSize: 18 }} /> Step 2: SpO2 Digital Filter Algorithms
                    <Tooltip title="Suppresses motion artifacts while preserving systolic peaks and dicrotic notches in Hand & Foot PPG pulse waves.">
                      <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "pointer" }} />
                    </Tooltip>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Select AWAD Adaptive Wavelet Strategy or Live Stream Mode
                  </Typography>
                </Box>

                {/* Tab Selector Buttons */}
                <ButtonGroup size="small" variant="outlined" color="success" fullWidth>
                  <Button
                    variant={spo2TabMode === "batch" ? "contained" : "outlined"}
                    startIcon={<AutoAwesomeRoundedIcon />}
                    onClick={() => { setSpo2TabMode("batch"); setActivePreset("custom"); }}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Offline Batch DSP & AWAD
                  </Button>
                  <Button
                    variant={spo2TabMode === "live" ? "contained" : "outlined"}
                    startIcon={<WavesRoundedIcon />}
                    onClick={() => { setSpo2TabMode("live"); setActivePreset("custom"); }}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                  >
                    Live Stream Mode
                  </Button>
                </ButtonGroup>

                {/* Tab 1: Live Stream Filters */}
                {spo2TabMode === "live" && (
                  <Stack spacing={2}>
                    <Card variant="outlined" sx={{ p: 2, background: "rgba(15, 23, 42, 0.4)", border: "1px solid rgba(74, 222, 128, 0.2)" }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#86efac", mb: 1 }}>
                        1. Time-Domain Streaming Filter
                      </Typography>
                      <Stack spacing={1.5}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={timeLowPassEnabled}
                              onChange={(e) => setTimeLowPassEnabled(e.target.checked)}
                              color="success"
                              size="small"
                            />
                          }
                          label={<Typography variant="body2">Low-Pass Filter (IIR Cutoff)</Typography>}
                        />
                        {timeLowPassEnabled && (
                          <Box sx={{ pl: 2, pr: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Cutoff Frequency: {timeLowPassCutoffHz} Hz
                            </Typography>
                            <Slider
                              value={timeLowPassCutoffHz}
                              onChange={(_, v) => setTimeLowPassCutoffHz(v)}
                              min={5}
                              max={25}
                              step={1}
                              size="small"
                              color="success"
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}

                        <FormControlLabel
                          control={
                            <Switch
                              checked={timeHighPassEnabled}
                              onChange={(e) => setTimeHighPassEnabled(e.target.checked)}
                              color="success"
                              size="small"
                            />
                          }
                          label={<Typography variant="body2">High-Pass Filter</Typography>}
                        />
                        {timeHighPassEnabled && (
                          <Box sx={{ pl: 2, pr: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Alpha Coefficient: {timeHighPassCutoff}
                            </Typography>
                            <Slider
                              value={timeHighPassCutoff}
                              onChange={(_, v) => setTimeHighPassCutoff(v)}
                              min={0.80}
                              max={0.98}
                              step={0.02}
                              size="small"
                              color="success"
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      </Stack>
                    </Card>

                    <Card variant="outlined" sx={{ p: 2, background: "rgba(15, 23, 42, 0.4)", border: "1px solid rgba(56, 189, 248, 0.2)" }}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#38bdf8", mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
                        <CleaningServicesRoundedIcon sx={{ fontSize: 16 }} /> 2. Streaming Noise & Artifact Suppression
                      </Typography>
                      <Stack spacing={1.5}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={notchFilterSpo2Enabled}
                              onChange={(e) => setNotchFilterSpo2Enabled(e.target.checked)}
                              color="primary"
                              size="small"
                            />
                          }
                          label={<Typography variant="body2">Notch Filter (Powerline Noise)</Typography>}
                        />
                        {notchFilterSpo2Enabled && (
                          <Box sx={{ pl: 2, pr: 1 }}>
                            <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                              Target Powerline Frequency
                            </Typography>
                            <ButtonGroup size="small" variant="outlined" color="primary" fullWidth>
                              <Button
                                variant={notchFreqSpo2 === 50 ? "contained" : "outlined"}
                                onClick={() => setNotchFreqSpo2(50)}
                              >
                                50 Hz (EU / Asia Grid)
                              </Button>
                              <Button
                                variant={notchFreqSpo2 === 60 ? "contained" : "outlined"}
                                onClick={() => setNotchFreqSpo2(60)}
                              >
                                60 Hz (US Grid)
                              </Button>
                            </ButtonGroup>
                          </Box>
                        )}

                        <FormControlLabel
                          control={
                            <Switch
                              checked={smoothingEnabled}
                              onChange={(e) => setSmoothingEnabled(e.target.checked)}
                              color="primary"
                              size="small"
                            />
                          }
                          label={<Typography variant="body2">Smoothing (Moving Average)</Typography>}
                        />
                        {smoothingEnabled && (
                          <Box sx={{ pl: 2, pr: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Smoothing Span: {smoothingPoints} points
                            </Typography>
                            <Slider
                              value={smoothingPoints}
                              onChange={(_, v) => setSmoothingPoints(v)}
                              min={2}
                              max={7}
                              step={1}
                              size="small"
                              color="primary"
                              valueLabelDisplay="auto"
                            />
                          </Box>
                        )}
                      </Stack>
                    </Card>
                  </Stack>
                )}

                {/* Tab 2: Advanced Offline Batch DSP & AWAD Radio Options */}
                {spo2TabMode === "batch" && (
                  <FormControl component="fieldset" sx={{ width: "100%" }}>
                    <RadioGroup
                      value={batchAlgorithm}
                      onChange={(e) => { setBatchAlgorithm(e.target.value); setActivePreset("custom"); }}
                    >
                      <Stack spacing={1.5}>
                        {/* 0. Pass-Through Raw Signal Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            background: batchAlgorithm === "raw" ? "rgba(245, 158, 11, 0.15)" : "rgba(15, 23, 42, 0.4)",
                            border: batchAlgorithm === "raw" ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.1)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <FormControlLabel
                            value="raw"
                            control={<Radio size="small" color="warning" />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#f59e0b" }}>
                                  Raw Signal (Pass-Through)
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Unfiltered raw pulse oximeter hardware baseline signal.
                                </Typography>
                              </Box>
                            }
                          />
                          {batchAlgorithm === "raw" && (
                            <Box sx={{ pl: 4, pr: 1, mt: 1 }}>
                              <Button
                                variant="contained"
                                color="warning"
                                size="small"
                                startIcon={isExportingRawPdf ? <CircularProgress size={14} color="inherit" /> : <PictureAsPdfRoundedIcon />}
                                onClick={handleExportRawPdf}
                                disabled={isExportingRawPdf}
                                fullWidth
                                sx={{ textTransform: "none", fontWeight: 700, borderRadius: 1.5 }}
                              >
                                {isExportingRawPdf ? "Preparing Raw PDF..." : "Export Raw Data PDF"}
                              </Button>
                            </Box>
                          )}
                        </Card>

                        {/* 1. AWAD (Adaptive Wavelet Artifact Denoising) Card - ÖNERİLEN FİLTRE */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            background: batchAlgorithm === "awad" ? "rgba(168, 85, 247, 0.2)" : "rgba(15, 23, 42, 0.4)",
                            border: batchAlgorithm === "awad" ? "1.5px solid #c084fc" : "1px solid rgba(255, 255, 255, 0.1)",
                            boxShadow: batchAlgorithm === "awad" ? "0 0 12px rgba(192, 132, 252, 0.2)" : "none",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <FormControlLabel
                            value="awad"
                            control={<Radio size="small" color="secondary" />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#c084fc", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  AWAD (Adaptive Wavelet Denoising)
                                  <Tooltip title="Adaptive Wavelet Artifact Denoising dynamically computes sliding sub-band variance thresholds for Hand & Foot PPG channels.">
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: "#c084fc", cursor: "pointer" }} />
                                  </Tooltip>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  Adaptive variance-based wavelet thresholding for motion artifacts. Preserves raw amplitude relationships for PI & PVI calculations.
                                </Typography>
                              </Box>
                            }
                          />
                          {batchAlgorithm === "awad" && (
                            <Box sx={{ pl: 4, pr: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                AWAD Adaptation Gain: {awadGain.toFixed(1)}x
                              </Typography>
                              <Slider
                                value={awadGain}
                                onChange={(_, v) => setAwadGain(v)}
                                min={0.5}
                                max={2.5}
                                step={0.1}
                                size="small"
                                color="secondary"
                                valueLabelDisplay="auto"
                              />
                            </Box>
                          )}
                        </Card>

                        {/* 2. Savitzky-Golay Filter Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            background: batchAlgorithm === "savgol" ? "rgba(56, 189, 248, 0.15)" : "rgba(15, 23, 42, 0.4)",
                            border: batchAlgorithm === "savgol" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.1)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <FormControlLabel
                            value="savgol"
                            control={<Radio size="small" color="primary" />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  Savitzky-Golay Polynomial Filter
                                  <Tooltip title="Polynomial local fitting filter. Preserves sharp systolic peaks and dicrotic notch detail.">
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "pointer" }} />
                                  </Tooltip>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  Polynomial local fitting preserves peak sharpness & dicrotic notch.
                                </Typography>
                              </Box>
                            }
                          />
                          {batchAlgorithm === "savgol" && (
                            <Box sx={{ pl: 4, pr: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Polynomial Window Size: {savgolWindow} points
                              </Typography>
                              <ButtonGroup size="small" variant="outlined" color="primary" fullWidth sx={{ mt: 0.5 }}>
                                <Button
                                  variant={savgolWindow === 5 ? "contained" : "outlined"}
                                  onClick={() => setSavgolWindow(5)}
                                >
                                  5 Points (Sharp Notch)
                                </Button>
                                <Button
                                  variant={savgolWindow === 7 ? "contained" : "outlined"}
                                  onClick={() => setSavgolWindow(7)}
                                >
                                  7 Points (Smooth)
                                </Button>
                              </ButtonGroup>
                            </Box>
                          )}
                        </Card>

                        {/* 3. Zero-Phase Forward-Backward IIR (filtfilt) Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            background: batchAlgorithm === "filtfilt" ? "rgba(74, 222, 128, 0.15)" : "rgba(15, 23, 42, 0.4)",
                            border: batchAlgorithm === "filtfilt" ? "1px solid #4ade80" : "1px solid rgba(255, 255, 255, 0.1)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <FormControlLabel
                            value="filtfilt"
                            control={<Radio size="small" color="success" />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  Zero-Phase IIR Filter (filtfilt)
                                  <Tooltip title="Forward-backward two-pass filtering eliminates phase shift (0° lag) to maintain precise ECG-PPG temporal alignment.">
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "pointer" }} />
                                  </Tooltip>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  Forward-backward pass eliminates phase shift (0° lag) for zero delay.
                                </Typography>
                              </Box>
                            }
                          />
                          {batchAlgorithm === "filtfilt" && (
                            <Box sx={{ pl: 4, pr: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Filtfilt Cutoff Frequency: {filtfiltCutoffHz} Hz
                              </Typography>
                              <Slider
                                value={filtfiltCutoffHz}
                                onChange={(_, v) => setFiltfiltCutoffHz(v)}
                                min={8}
                                max={30}
                                step={1}
                                size="small"
                                color="success"
                                valueLabelDisplay="auto"
                              />
                            </Box>
                          )}
                        </Card>

                        {/* 4. Daubechies-4 (DB4) Discrete Wavelet Denoising Card */}
                        <Card
                          variant="outlined"
                          sx={{
                            p: 1.5,
                            background: batchAlgorithm === "wavelet" ? "rgba(251, 146, 60, 0.15)" : "rgba(15, 23, 42, 0.4)",
                            border: batchAlgorithm === "wavelet" ? "1px solid #fb923c" : "1px solid rgba(255, 255, 255, 0.1)",
                            transition: "all 0.2s ease"
                          }}
                        >
                          <FormControlLabel
                            value="wavelet"
                            control={<Radio size="small" color="warning" />}
                            label={
                              <Box>
                                <Typography variant="subtitle2" fontWeight={700} sx={{ color: "#fb923c", display: "flex", alignItems: "center", gap: 0.5 }}>
                                  Daubechies-4 Wavelet Denoising (DB4)
                                  <Tooltip title="Multi-resolution sub-band thresholding for severe motion artifact and muscle tremor removal.">
                                    <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "pointer" }} />
                                  </Tooltip>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                                  Multi-resolution sub-band thresholding for severe motion artifacts.
                                </Typography>
                              </Box>
                            }
                          />
                          {batchAlgorithm === "wavelet" && (
                            <Box sx={{ pl: 4, pr: 1, mt: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Noise Threshold Factor: {waveletThreshold.toFixed(1)}x
                              </Typography>
                              <Slider
                                value={waveletThreshold}
                                onChange={(_, v) => setWaveletThreshold(v)}
                                min={0.5}
                                max={2.0}
                                step={0.1}
                                size="small"
                                color="warning"
                                valueLabelDisplay="auto"
                              />
                            </Box>
                          )}
                        </Card>
                      </Stack>
                    </RadioGroup>
                  </FormControl>
                )}
              </Stack>

              <Divider />

              {/* Step 3: Time Alignment */}
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  Step 3: Time Alignment Offset (ms)
                  <Tooltip title="Fine-tunes temporal synchronization between ECG R-peak and SpO2 pulse wave (Pulse Transit Time - PTT).">
                    <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", cursor: "pointer" }} />
                  </Tooltip>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Fine-tune temporal alignment between ECG R-peaks and Hand/Foot SpO2 pulse waves.
                </Typography>
                <Slider
                  value={timeSyncOffset}
                  onChange={(_, v) => setTimeSyncOffset(v)}
                  min={-20}
                  max={20}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Stack>

              <Card variant="outlined" sx={{ backgroundColor: "rgba(15, 23, 42, 0.6)", borderColor: "success.main" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CheckCircleRoundedIcon color="success" />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Dual Limb POX Status: Ready</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Hand SQI: {handSqiMetrics.overallSqi}% | Foot SQI: {footSqiMetrics.overallSqi}% | PTT: {pulseTransitTimeMs}ms
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Next Workflow CTA */}
              <Button
                component={Link}
                to={`/ai-module-ecg-pulse-oximeter/${patient?.id || "PT-1001"}/${exam?.id || "EPO_Exam_1001"}`}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                fullWidth
                sx={{ py: 1.5, fontWeight: 700, borderRadius: 2 }}
              >
                Proceed to AI Model Selection
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
