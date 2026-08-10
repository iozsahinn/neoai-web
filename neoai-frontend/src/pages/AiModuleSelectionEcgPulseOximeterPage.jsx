import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import PsychologyRoundedIcon from "@mui/icons-material/PsychologyRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Slider,
  Stack,
  Typography
} from "@mui/material";
import { WorkflowSteps } from "../components/WorkflowSteps";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";

const aiModules = [
  {
    id: "cardiorespiratory-sync",
    name: "Integrated Cardiorespiratory Sync & Apnea-Bradycardia Detector",
    version: "v2.4",
    recommended: true,
    description:
      "Performs cross-correlation analysis between continuous Lead II ECG R-R intervals and SpO2 desaturation episodes to detect hypoxic reflex bradycardias.",
    tags: ["Sync Analysis", "Apnea & Bradycardia", "High Precision"]
  },
  {
    id: "pulse-transit-time",
    name: "Pulse Transit Time (PTT) & Hemodynamic Stability Model",
    version: "v1.8",
    recommended: false,
    description:
      "Calculates the time delay between the ECG R-wave peak and the SpO2 plethysmograph pulse wave foot to evaluate continuous blood pressure surrogates.",
    tags: ["PTT Metric", "Vascular Tone", "Hemodynamics"]
  },
  {
    id: "hypoxia-arrhythmia",
    name: "Hypoxia-Induced Arrhythmia Early Warning System",
    version: "v1.2",
    recommended: false,
    description:
      "Detects ectopic beats, ventricular premature contractions, and ST-segment shifts specifically triggered during hypoxemia events.",
    tags: ["Arrhythmia", "ECG Morphometry", "Early Alert"]
  }
];

export function AiModuleSelectionEcgPulseOximeterPage() {
  const { patientId, examinationId } = useParams();
  const navigate = useNavigate();

  const [selectedModuleId, setSelectedModuleId] = useState("cardiorespiratory-sync");
  const [sensitivity, setSensitivity] = useState(85);
  const [windowSize, setWindowSize] = useState(30);
  const [isRunning, setIsRunning] = useState(false);

  function handleRunInference() {
    setIsRunning(true);
    const actionLog = logSimpleAction(
      "Run Integrated ECG+PO AI Inference",
      ActionTypes.AI_INFERENCE,
      `Executing AI module ${selectedModuleId} on patient ${patientId}`,
      { patientId, examinationId, moduleId: selectedModuleId }
    );

    setTimeout(() => {
      setIsRunning(false);
      completeAction(actionLog.id, "SUCCEEDED");
      navigate("/results-ecg-pulse-oximeter/REP-EPO-3001");
    }, 1500);
  }

  const context = {
    patientId: patientId || "PT-1001",
    examinationId: examinationId || "EPO_Exam_1001",
    reportId: "REP-EPO-3001"
  };

  return (
    <Stack spacing={3} className="page-container">
      <WorkflowSteps currentStep="ai-module" context={context} />

      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Button
          component={Link}
          to={`/preprocessing-ecg-pulse-oximeter/${context.patientId}/${context.examinationId}`}
          startIcon={<ArrowBackRoundedIcon />}
          variant="outlined"
        >
          Back to Preprocessing
        </Button>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="h5" fontWeight={700}>Select Dual Signal AI Model</Typography>
          <Typography variant="body2" color="text.secondary">
            Choose a multi-modal AI algorithm for synchronized ECG & SpO2 inference.
          </Typography>
        </Box>
      </Stack>

      <Grid container spacing={3}>
        {/* Model Cards */}
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Stack spacing={2}>
            {aiModules.map((module) => {
              const isSelected = selectedModuleId === module.id;
              return (
                <Card
                  key={module.id}
                  variant="outlined"
                  sx={{
                    borderColor: isSelected ? "primary.main" : "divider",
                    borderWidth: isSelected ? 2 : 1,
                    transition: "all 0.2s ease"
                  }}
                >
                  <CardActionArea onClick={() => setSelectedModuleId(module.id)}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>{module.name}</Typography>
                            {module.recommended ? (
                              <Chip label="Recommended" color="success" size="small" sx={{ fontWeight: 700 }} />
                            ) : null}
                          </Stack>
                          <Typography color="text.secondary" variant="body2">
                            {module.description}
                          </Typography>
                        </Box>
                        {isSelected ? <CheckCircleRoundedIcon color="primary" sx={{ fontSize: 28 }} /> : null}
                      </Stack>

                      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                        {module.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Stack>
        </Grid>

        {/* Hyperparameter & Run Sidebar */}
        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <PsychologyRoundedIcon color="primary" /> Algorithm Settings
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Tune model threshold & temporal windowing before running inference.
                </Typography>
              </Box>

              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Detection Sensitivity ({sensitivity}%)</Typography>
                <Slider
                  value={sensitivity}
                  onChange={(_, v) => setSensitivity(v)}
                  min={50}
                  max={99}
                  valueLabelDisplay="auto"
                />
              </Stack>

              <Stack spacing={1}>
                <Typography variant="subtitle2" fontWeight={700}>Cross-Correlation Window ({windowSize}s)</Typography>
                <Slider
                  value={windowSize}
                  onChange={(_, v) => setWindowSize(v)}
                  min={10}
                  max={60}
                  step={5}
                  valueLabelDisplay="auto"
                />
              </Stack>

              <Button
                variant="contained"
                size="large"
                disabled={isRunning}
                onClick={handleRunInference}
                startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowRoundedIcon />}
                sx={{ py: 1.75, fontWeight: 700, fontSize: "1.05rem" }}
              >
                {isRunning ? "Running Multi-Modal Inference..." : "Execute AI Analysis"}
              </Button>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
