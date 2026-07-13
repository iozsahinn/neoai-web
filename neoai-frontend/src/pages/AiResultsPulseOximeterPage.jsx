import { useMemo, useState, useRef } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { getReportById } from "../services/mockApi";
import { Box, Button, Paper, Stack, Typography, Grid, Chip, TextField, CircularProgress } from "@mui/material";
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ReportSection = ({ title, children, sx }) => (
  <Box>
    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>{title}</Typography>
    <Paper sx={{ p: 2.5, mt: 1, border: '1px solid rgba(148, 197, 255, 0.12)', ...sx }}>
      {children}
    </Paper>
  </Box>
);

export function AiResultsPulseOximeterPage() {
  const { reportId } = useParams();
  const location = useLocation();
  const reportData = useMemo(() => getReportById(reportId), [reportId]);

  const [report, setReport] = useState(reportData);
  const [isExporting, setIsExporting] = useState(false);
  const reportContentRef = useRef(null);
  
  const chartImages = location.state?.chartImages || {};

  if (!report) {
    return (
      <div className="page-stack">
        <section className="panel">
          <h2>Report not found</h2>
          <Link className="secondary-button" to="/query-pulse-oximeter">
            Back to query
          </Link>
        </section>
      </div>
    );
  }
  
  const handleInputChange = (field, value) => {
    setReport(prev => ({ ...prev, [field]: value }));
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      // 1. Add the main report content
      const canvas = await html2canvas(reportContentRef.current, { 
        backgroundColor: '#121212',
        scale: 2
      });
      const imgData = canvas.toDataURL('image/png');
      const imgProps = pdf.getImageProperties(imgData);
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);

      // 2. Add the captured charts on a new page
      if (Object.keys(chartImages).length > 0) {
        pdf.addPage();
        pdf.setFontSize(16);
        pdf.text("Analysis Charts", 15, 20);
        let yPos = 30;

        for (const [key, imageDataUrl] of Object.entries(chartImages)) {
          const chartImgProps = pdf.getImageProperties(imageDataUrl);
          const chartHeight = (chartImgProps.height * (pdfWidth - 30)) / chartImgProps.width;
          if (yPos + chartHeight > pdfHeight - 20) {
            pdf.addPage();
            yPos = 20;
          }
          pdf.setFontSize(12);
          pdf.text(key.charAt(0).toUpperCase() + key.slice(1) + " Chart", 15, yPos);
          yPos += 5;
          pdf.addImage(imageDataUrl, 'PNG', 15, yPos, pdfWidth - 30, chartHeight);
          yPos += chartHeight + 15;
        }
      }
      
      pdf.save(`report-${report.id}.pdf`);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      alert("Failed to export PDF. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 1200, mx: 'auto' }}>
      <Paper
        sx={{
          p: 3.5,
          borderRadius: 1,
          border: "1px solid rgba(148, 197, 255, 0.12)",
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.2)"
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={3}>
          <Box>
            <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: "0.14em", fontWeight: 700 }}>
              AI Assisted Report
            </Typography>
            <Typography variant="h4">{report.title}</Typography>
            <Typography color="text.secondary">Report ID: {report.id}</Typography>
          </Box>
          <Button variant="contained" startIcon={<PictureAsPdfRoundedIcon />} onClick={handleExportPdf} disabled={isExporting}>
            {isExporting ? <CircularProgress size={24} color="inherit" /> : 'Export to PDF'}
          </Button>
        </Stack>
      </Paper>

      <Box ref={reportContentRef} sx={{p: 0.5}}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Stack spacing={3}>
              <ReportSection title="Analysis Summary">
                <Typography>{report.summary}</Typography>
              </ReportSection>
              <ReportSection title="Key Findings">
                <Stack component="ul" spacing={1} sx={{ pl: 2, m: 0 }}>
                  {report.findings.map((finding, index) => (
                    <Typography component="li" key={index}>{finding}</Typography>
                  ))}
                </Stack>
              </ReportSection>
              <ReportSection title="Clinical Interpretation">
                <Typography>{report.clinicalInterpretation}</Typography>
              </ReportSection>
              <ReportSection title="Doctor's Commentary">
                <TextField
                  fullWidth
                  multiline
                  variant="outlined"
                  value={report.doctorCommentary}
                  onChange={(e) => handleInputChange('doctorCommentary', e.target.value)}
                  placeholder="Enter your comments here..."
                />
              </ReportSection>
            </Stack>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Stack spacing={3}>
              <ReportSection title="Patient Information">
                <Typography><strong>Patient ID:</strong> {report.patientId}</Typography>
                <Typography><strong>Date of Birth:</strong> {report.dateOfBirth}</Typography>
                <Typography><strong>Gestational Age:</strong> {report.gestationalAge}</Typography>
                <Typography><strong>Postnatal Age:</strong> {report.postnatalAge}</Typography>
              </ReportSection>
              <ReportSection title="Final Diagnosis & Recommendations">
                <TextField
                    label="Final Diagnosis"
                    fullWidth
                    multiline
                    variant="outlined"
                    value={report.finalDiagnosis}
                    onChange={(e) => handleInputChange('finalDiagnosis', e.target.value)}
                    sx={{mb: 2}}
                  />
                  <TextField
                    label="Treatment Recommendation"
                    fullWidth
                    multiline
                    variant="outlined"
                    value={report.treatmentRecommendation}
                    onChange={(e) => handleInputChange('treatmentRecommendation', e.target.value)}
                  />
              </ReportSection>
              <ReportSection title="Report Details">
                <Typography><strong>Confidence:</strong> <Chip label={report.confidence} color="success" size="small" sx={{fontWeight: 700}} /></Typography>
                <Typography><strong>Reviewed By:</strong> {report.reviewedBy}</Typography>
                <Typography><strong>Report Date:</strong> {report.reportDate}</Typography>
              </ReportSection>
            </Stack>
          </Grid>
        </Grid>
      </Box>
    </Stack>
  );
}
