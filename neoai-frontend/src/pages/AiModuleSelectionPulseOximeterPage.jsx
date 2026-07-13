import { useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Box, Button, Paper, Stack, Typography, Switch, FormControlLabel } from "@mui/material";

const AI_MODULE_OPTIONS = [
  {
    id: "hypoxia-detection",
    label: "Hypoxia Detection",
    description: "Analyzes SpO2 signal for significant desaturation events."
  },
  {
    id: "bradycardia-analysis",
    label: "Bradycardia Analysis",
    description: "Detects periods of abnormally low heart rate."
  }
];

const AiModuleOptionsSidebar = ({ selectedModuleIds, showMenu, onClose, onOpen, onToggleModule }) => {
  return (
    <aside className={`selection-sidebar preprocessing-sidebar ai-module-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <div className="preprocessing-sidebar-header">
          <button className="panel-arrow-toggle" type="button" onClick={onClose}>
            ‹
          </button>
          <div className="preprocessing-sidebar-copy">
            <span className="selection-toolbar-kicker">AI Module</span>
            <strong>Options</strong>
            <span>Choose the analysis module to run for the signal data.</span>
          </div>
        </div>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}

      {showMenu ? (
        <div className="preprocessing-operation-list ai-module-option-list">
          {AI_MODULE_OPTIONS.map((moduleOption) => {
            const isActive = selectedModuleIds.includes(moduleOption.id);
            return (
              <button
                key={moduleOption.id}
                className={`preprocessing-operation-card ai-module-option-card${isActive ? " active" : ""}`}
                type="button"
                onClick={() => onToggleModule(moduleOption.id)}
              >
                <div className="preprocessing-operation-top">
                  <div className="ai-module-option-copy">
                    <p>{moduleOption.label}</p>
                    <span>{moduleOption.description}</span>
                  </div>
                  <span className={`ai-module-option-indicator${isActive ? " active" : ""}`} aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </aside>
  );
};

export function AiModuleSelectionPulseOximeterPage() {
  const { patientId, examinationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [showOptionsMenu, setShowOptionsMenu] = useState(true);
  const [selectedModuleIds, setSelectedModuleIds] = useState([AI_MODULE_OPTIONS[0].id]);

  const handleToggleModule = (moduleId) => {
    setSelectedModuleIds((current) =>
      current.includes(moduleId) ? current.filter((item) => item !== moduleId) : [...current, moduleId]
    );
  };

  const handleContinue = () => {
    const reportId = "REP-PO-2001"; // The new report ID from mockData.js
    navigate(`/results-pulse-oximeter/${reportId}`, {
      state: {
        ...location.state,
        patientId,
        examinationId,
        reportId,
        selectedModuleIds
      }
    });
  };

  return (
    <div className="page-stack selection-page">
      <section className={`selection-layout${showOptionsMenu ? "" : " hide-left"}`}>
        <AiModuleOptionsSidebar
          selectedModuleIds={selectedModuleIds}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
          onToggleModule={handleToggleModule}
        />

        <section className="selection-main panel">
          <Stack spacing={2} sx={{ p: 2 }}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Typography variant="h4">Select AI Module for Pulse Oximeter</Typography>
              <Button variant="contained" onClick={handleContinue} disabled={selectedModuleIds.length === 0}>
                Generate Report
              </Button>
            </Box>
            <Paper sx={{p: 4, textAlign: 'center'}}>
              <Typography variant="h6">Ready for AI Analysis</Typography>
              <Typography color="text.secondary">
                Select one or more AI modules from the left panel to generate a clinical report for examination {examinationId}.
              </Typography>
            </Paper>
          </Stack>
        </section>
      </section>
    </div>
  );
}
