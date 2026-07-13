import { useEffect, useMemo, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTheme } from '@mui/material/styles';
import { findPatientById } from "../services/mockApi";
import { Box, Button, Paper, Stack, Typography, Switch, FormControlLabel, CircularProgress } from "@mui/material";
import html2canvas from 'html2canvas';

// A more advanced chart component to visualize data
const SignalChart = ({ title, data, type = 'line' }) => {
  const theme = useTheme();
  const primaryColor = theme.palette.primary.main;
  const textColor = theme.palette.text.secondary;

  const padding = { top: 10, right: 10, bottom: 20, left: 40 };
  const chartWidth = 500;
  const chartHeight = 180;

  const { path, bars, yAxisLabels } = useMemo(() => {
    if (!data || data.length === 0) return { path: '', bars: [], yAxisLabels: [] };

    const maxVal = Math.max(...data);
    const minVal = type === 'bar' ? 0 : Math.min(...data);
    const valueRange = maxVal - minVal === 0 ? 1 : maxVal - minVal;

    const scaleY = (chartHeight - padding.top - padding.bottom) / valueRange;
    const scaleX = (chartWidth - padding.left - padding.right) / (data.length > 1 ? data.length - 1 : 1);

    const pathData = data
      .map((value, index) => {
        const x = padding.left + index * scaleX;
        const y = chartHeight - padding.bottom - (value - minVal) * scaleY;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');

    const barWidth = (chartWidth - padding.left - padding.right) / data.length;
    const barElements = data.map((value, index) => {
      const barHeight = (value - minVal) * scaleY;
      const x = padding.left + index * barWidth;
      const y = chartHeight - padding.bottom - barHeight;
      return { x, y, width: barWidth * 0.9, height: barHeight };
    });
    
    const labels = [
        { value: maxVal.toFixed(1), y: padding.top },
        { value: minVal.toFixed(1), y: chartHeight - padding.bottom }
    ];
    if (type === 'line' && valueRange > 1) {
        labels.splice(1, 0, { value: ((maxVal + minVal) / 2).toFixed(1), y: (chartHeight - padding.bottom + padding.top) / 2 });
    }

    return { path: pathData, bars: barElements, yAxisLabels: labels };
  }, [data, type, chartHeight, chartWidth, padding]);

  return (
    <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" sx={{ mb: 1 }}>{title}</Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <svg width="100%" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          {/* Y-Axis Line */}
          <line x1={padding.left} y1={padding.top} x2={padding.left} y2={chartHeight - padding.bottom} stroke={textColor} strokeWidth="1" />
          {/* Y-Axis Labels */}
          {yAxisLabels.map(label => (
             <text key={label.value} x={padding.left - 8} y={label.y + 4} fill={textColor} fontSize="10" textAnchor="end">{label.value}</text>
          ))}

          {/* X-Axis Line */}
          <line x1={padding.left} y1={chartHeight - padding.bottom} x2={chartWidth - padding.right} y2={chartHeight - padding.bottom} stroke={textColor} strokeWidth="1" />
          <text x={chartWidth / 2} y={chartHeight - padding.bottom + 15} fill={textColor} fontSize="10" textAnchor="middle">Time / Frequency</text>

          {(!data || data.length === 0) ? (
            <text x={chartWidth / 2} y={chartHeight / 2} fill={textColor} textAnchor="middle">No data to display</text>
          ) : type === 'line' ? (
            <path d={path} stroke={primaryColor} strokeWidth="2" fill="none" />
          ) : (
            bars.map((bar, index) => (
              <rect key={index} x={bar.x} y={bar.y} width={bar.width} height={bar.height} fill={primaryColor} />
            ))
          )}
        </svg>
      </Box>
    </Paper>
  );
};


const PreprocessingOptionsSidebar = ({ operations, onToggleOperation, showMenu, onClose, onOpen }) => {
  return (
    <aside className={`selection-sidebar preprocessing-sidebar ai-module-sidebar panel${showMenu ? "" : " collapsed"}`}>
      {showMenu ? (
        <div className="preprocessing-sidebar-header">
          <button className="panel-arrow-toggle" type="button" onClick={onClose}>
            ‹
          </button>
          <div className="preprocessing-sidebar-copy">
            <span className="selection-toolbar-kicker">Preprocessing</span>
            <strong>Options</strong>
            <span>Choose the signal processing methods to apply.</span>
          </div>
        </div>
      ) : (
        <button className="panel-edge-toggle" type="button" onClick={onOpen}>
          ›
        </button>
      )}

      {showMenu ? (
        <div className="preprocessing-operation-list">
          {Object.values(operations).map((op) => (
            <Paper key={op.id} sx={{ p: 2, mb: 1 }}>
              <FormControlLabel
                control={<Switch checked={op.enabled} onChange={(e) => onToggleOperation(op.id, e.target.checked)} />}
                label={op.label}
              />
            </Paper>
          ))}
        </div>
      ) : null}
    </aside>
  );
};

export function DataPreprocessingPulseOximeterPage() {
  const { patientId, examinationId } = useParams();
  const navigate = useNavigate();
  const patient = useMemo(() => findPatientById(patientId), [patientId]);
  const pulseOximeterExamination = useMemo(() => {
    return patient?.pulseOximeterExaminations?.find(ex => ex.id === examinationId);
  }, [patient, examinationId]);

  const [showOptionsMenu, setShowOptionsMenu] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [operations, setOperations] = useState({
    fourier: { id: 'fourier', label: 'Fourier Transform', enabled: false },
    wavelet: { id: 'wavelet', label: 'Wavelet Transform', enabled: false },
  });
  const [transformResults, setTransformResults] = useState({});

  const originalChartRef = useRef(null);
  const fourierChartRef = useRef(null);
  const waveletChartRef = useRef(null);

  useEffect(() => {
    const results = {};
    const originalData = pulseOximeterExamination?.signalData;

    if (!originalData) {
      setTransformResults({});
      return;
    }

    if (operations.fourier.enabled) {
      const fftResult = originalData.slice(0, originalData.length / 2).map((_, i) => 
        Math.abs(Math.sin(i / 2) * 50 + Math.random() * 20)
      );
      results.fourier = fftResult;
    }

    if (operations.wavelet.enabled) {
      results.wavelet = originalData.map(d => 
        parseFloat((d * (0.98 + (Math.random() - 0.5) * 0.02)).toFixed(2))
      );
    }

    setTransformResults(results);
  }, [operations, pulseOximeterExamination]);

  if (!pulseOximeterExamination) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>Pulse Oximeter Examination not found</h2>
          <Link className="secondary-button" to={`/query-pulse-oximeter`}>
            Back to query
          </Link>
        </section>
      </div>
    );
  }

  const handleToggleOperation = (id, enabled) => {
    setOperations(prev => ({
      ...prev,
      [id]: { ...prev[id], enabled }
    }));
  };
  
  const handleContinue = async () => {
    setIsProcessing(true);
    const chartImages = {};
    
    try {
      if (originalChartRef.current) {
        const canvas = await html2canvas(originalChartRef.current, { backgroundColor: '#121212' });
        chartImages.original = canvas.toDataURL('image/png');
      }
      if (operations.fourier.enabled && fourierChartRef.current) {
        const canvas = await html2canvas(fourierChartRef.current, { backgroundColor: '#121212' });
        chartImages.fourier = canvas.toDataURL('image/png');
      }
      if (operations.wavelet.enabled && waveletChartRef.current) {
        const canvas = await html2canvas(waveletChartRef.current, { backgroundColor: '#121212' });
        chartImages.wavelet = canvas.toDataURL('image/png');
      }

      navigate(`/ai-module-pulse-oximeter/${patientId}/${examinationId}`, { 
        state: { 
          patientId,
          examinationId,
          appliedOperations: operations,
          chartImages
        } 
      });
    } catch (error) {
      console.error("Error capturing charts:", error);
      // Still navigate but without images
      navigate(`/ai-module-pulse-oximeter/${patientId}/${examinationId}`, { 
        state: { patientId, examinationId, appliedOperations: operations } 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="page-stack selection-page">
      <section className={`selection-layout${showOptionsMenu ? "" : " hide-left"}`}>
        <PreprocessingOptionsSidebar
          operations={operations}
          onToggleOperation={handleToggleOperation}
          showMenu={showOptionsMenu}
          onClose={() => setShowOptionsMenu(false)}
          onOpen={() => setShowOptionsMenu(true)}
        />

        <section className="selection-main panel">
          <Stack spacing={2} sx={{ p: 2 }}>
            <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Typography variant="h4">Pulse Oximeter Preprocessing</Typography>
              <Button variant="contained" onClick={handleContinue} disabled={isProcessing}>
                {isProcessing ? <CircularProgress size={24} color="inherit" /> : 'Continue'}
              </Button>
            </Box>
            <Typography>Patient: {patientId} - Examination: {examinationId}</Typography>
            
            <Box ref={originalChartRef}>
              <SignalChart title="Original Signal" data={pulseOximeterExamination.signalData} type="line" />
            </Box>
            
            {operations.fourier.enabled && (
              <Box ref={fourierChartRef}>
                <SignalChart title="Fourier Transform Result (Spectrogram)" data={transformResults.fourier} type="bar" />
              </Box>
            )}
            
            {operations.wavelet.enabled && (
              <Box ref={waveletChartRef}>
                <SignalChart title="Wavelet Transform Result (Denoised Signal)" data={transformResults.wavelet} type="line" />
              </Box>
            )}
          </Stack>
        </section>
      </section>
    </div>
  );
}
