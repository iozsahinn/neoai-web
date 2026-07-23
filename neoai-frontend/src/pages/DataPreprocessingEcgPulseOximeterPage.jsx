import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Slider,
  Stack,
  Switch,
  Typography
} from "@mui/material";
import { findPatientById } from "../services/mockApi";
import { WorkflowSteps } from "../components/WorkflowSteps";

export function DataPreprocessingEcgPulseOximeterPage() {
  const { patientId, examinationId } = useParams();
  const patient = useMemo(() => findPatientById(patientId || "PT-1001"), [patientId]);
  const exam = useMemo(() => {
    return patient?.ecgPulseOximeterExaminations?.find((e) => e.id === examinationId) ||
      patient?.ecgPulseOximeterExaminations?.[0];
  }, [patient, examinationId]);

  // Filter States
  const [notchFilter, setNotchFilter] = useState(true);
  const [bandpassFilter, setBandpassFilter] = useState(true);
  const [baselineCorrection, setBaselineCorrection] = useState(true);
  const [spo2Smoothing, setSpo2Smoothing] = useState(true);
  const [timeSyncOffset, setTimeSyncOffset] = useState(0);

  const rawEcg = exam?.ecgSignalData || [];
  const rawSpo2 = exam?.spo2SignalData || [];

  // Filtered Signal Computation
  const processedEcg = useMemo(() => {
    return rawEcg.map((val, idx) => {
      let v = val;
      if (baselineCorrection) {
        v -= Math.sin(idx / 30) * 0.05; // Remove baseline drift
      }
      if (notchFilter && idx % 2 === 0) {
        v *= 0.98; // Apply 50Hz notch attenuation
      }
      return parseFloat(v.toFixed(3));
    });
  }, [rawEcg, baselineCorrection, notchFilter]);

  const processedSpo2 = useMemo(() => {
    return rawSpo2.map((val, idx) => {
      let v = val;
      if (spo2Smoothing && idx > 0 && idx < rawSpo2.length - 1) {
        v = (rawSpo2[idx - 1] + val + rawSpo2[idx + 1]) / 3; // 3-point moving average
      }
      return parseFloat(v.toFixed(2));
    });
  }, [rawSpo2, spo2Smoothing]);

  // Canvas / SVG Plot paths
  const width = 800;
  const height = 180;

  const ecgSvgPoints = useMemo(() => {
    const len = processedEcg.length || 1;
    return processedEcg
      .map((val, i) => {
        const x = (i / len) * width;
        const y = height / 2 - val * 70;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [processedEcg]);

  const spo2SvgPoints = useMemo(() => {
    const len = processedSpo2.length || 1;
    return processedSpo2
      .map((val, i) => {
        const x = ((i + timeSyncOffset) / len) * width;
        const y = height - ((val - 75) / 25) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [processedSpo2, timeSyncOffset]);

  const context = { patientId: patient?.id, examinationId: exam?.id, reportId: "REP-EPO-3001" };

  return (
    <Stack spacing={3} className="page-container">
      <WorkflowSteps currentStep="preprocessing" context={context} />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button component={Link} to="/query-ecg-pulse-oximeter" startIcon={<ArrowBackRoundedIcon />} variant="outlined">
          Back to Query
        </Button>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="h5" fontWeight={700}>Dual Signal Preprocessing</Typography>
          <Typography variant="body2" color="text.secondary">
            Patient: {patient?.name || "PT-1001"} | Exam: {exam?.id || "EPO_Exam_1001"}
          </Typography>
        </Box>
      </Stack>

      {/* Main Dual-Signal Visualizer */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Stack spacing={2.5}>
            {/* ECG Channel Chart */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, background: "rgba(15, 23, 42, 0.6)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#38bdf8", display: "flex", alignItems: "center", gap: 1 }}>
                  Channel 1: ECG Lead II Signal (mV)
                </Typography>
                <Chip label="250 Hz Sampling" size="small" color="primary" variant="outlined" />
              </Stack>
              <Box sx={{ width: "100%", height: 180, position: "relative", overflow: "hidden", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 1 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[30, 60, 90, 120, 150].map((y) => (
                    <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  ))}
                  <polyline points={ecgSvgPoints} fill="none" stroke="#38bdf8" strokeWidth="2" />
                </svg>
              </Box>
            </Paper>

            {/* SpO2 Channel Chart */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2, background: "rgba(15, 23, 42, 0.6)" }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ color: "#4ade80", display: "flex", alignItems: "center", gap: 1 }}>
                  Channel 2: Pulse Oximeter SpO2 Wave (%)
                </Typography>
                <Chip label="Synchronized Timeframe" size="small" color="success" variant="outlined" />
              </Stack>
              <Box sx={{ width: "100%", height: 180, position: "relative", overflow: "hidden", border: "1px dashed rgba(255,255,255,0.15)", borderRadius: 1 }}>
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                  {/* Grid Lines */}
                  {[40, 80, 120, 160].map((y) => (
                    <line key={y} x1="0" y1={y} x2={width} y2={y} stroke="rgba(255,255,255,0.05)" strokeDasharray="4 4" />
                  ))}
                  <polyline points={spo2SvgPoints} fill="none" stroke="#4ade80" strokeWidth="2" />
                </svg>
              </Box>
            </Paper>
          </Stack>
        </Grid>

        {/* Preprocessing Control Sidebar */}
        <Grid size={{ xs: 12, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, height: "100%" }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <TuneRoundedIcon color="primary" /> Signal Processing Controls
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Configure filters and temporal alignment parameters before AI inference.
                </Typography>
              </Box>

              <Divider />

              {/* Filter Toggles */}
              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} color="primary">ECG Filters</Typography>
                <FormControlLabel
                  control={<Switch checked={notchFilter} onChange={(e) => setNotchFilter(e.target.checked)} color="primary" />}
                  label="50 Hz Powerline Notch Filter"
                />
                <FormControlLabel
                  control={<Switch checked={bandpassFilter} onChange={(e) => setBandpassFilter(e.target.checked)} color="primary" />}
                  label="Bandpass Filter (0.5 Hz - 40 Hz)"
                />
                <FormControlLabel
                  control={<Switch checked={baselineCorrection} onChange={(e) => setBaselineCorrection(e.target.checked)} color="primary" />}
                  label="Baseline Wandering Correction"
                />
              </Stack>

              <Divider />

              <Stack spacing={1.5}>
                <Typography variant="subtitle2" fontWeight={700} color="success.main">SpO2 Filters</Typography>
                <FormControlLabel
                  control={<Switch checked={spo2Smoothing} onChange={(e) => setSpo2Smoothing(e.target.checked)} color="success" />}
                  label="Artifact Removal & Smoothing"
                />
              </Stack>

              <Divider />

              {/* Time Alignment */}
              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Time Alignment Offset (ms)</Typography>
                <Typography variant="caption" color="text.secondary">
                  Fine-tune temporal alignment between ECG R-peak and SpO2 pulse wave.
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

              <Card variant="outlined" sx={{ bg: "action.hover", borderColor: "success.main" }}>
                <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <CheckCircleRoundedIcon color="success" />
                    <Box>
                      <Typography variant="body2" fontWeight={700}>Dual Signal Status</Typography>
                      <Typography variant="caption" color="text.secondary">
                        SNR: 24.5 dB | Quality Index: 98% (Optimal)
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              <Button
                component={Link}
                to={`/ai-module-ecg-pulse-oximeter/${patient?.id || "PT-1001"}/${exam?.id || "EPO_Exam_1001"}`}
                variant="contained"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                fullWidth
                sx={{ py: 1.5, fontWeight: 700 }}
              >
                Proceed to AI Selection
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
