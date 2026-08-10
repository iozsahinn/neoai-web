import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  Box,
  Button,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Collapse,
  Chip,
  Card,
  CardContent
} from "@mui/material";
import { findPatientById } from "../services/mockApi";
import { notifyUserError } from "../services/errorToastBus";
import { resetExaminationWorkflowSession } from "../utils/resetExaminationWorkflowSession";
import { getActiveWorkflowContext, resetWorkflowAfterStep, setActiveWorkflowContext } from "../utils/workflowState";
import { logSimpleAction, ActionTypes, completeAction } from "../services/actionLogger";

const QUERY_PAGE_STATE_KEY = "neoai-query-ecg-pulse-oximeter-page-state";

function parseExamDate(value) {
  return new Date(value.replace(" ", "T"));
}

function padDatePart(value) {
  return String(value).padStart(2, "0");
}

function formatDatePart(date) {
  return `${padDatePart(date.getDate())}-${padDatePart(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function formatExamDate(value) {
  const parsedDate = parseExamDate(value);
  if (Number.isNaN(parsedDate.getTime())) return value;
  const [, timePart] = value.split(" ");
  return timePart ? `${formatDatePart(parsedDate)} ${timePart}` : formatDatePart(parsedDate);
}

function parseDisplayDate(value) {
  const normalizedValue = value.trim();
  if (!normalizedValue) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    const parsedDate = new Date(`${normalizedValue}T00:00:00`);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }
  const match = normalizedValue.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  const parsedDate = new Date(`${year}-${padDatePart(month)}-${padDatePart(day)}T00:00:00`);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function normalizeDisplayDate(value) {
  const parsedDate = parseDisplayDate(value);
  return parsedDate ? formatDatePart(parsedDate) : value;
}

function formatInputDateValue(date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function normalizeInputDateValue(value) {
  const parsedDate = parseDisplayDate(value);
  return parsedDate ? formatInputDateValue(parsedDate) : "";
}

function getEndOfDay(date) {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

function getInitialPageState() {
  const rawValue = window.sessionStorage.getItem(QUERY_PAGE_STATE_KEY);
  if (!rawValue) return null;
  try {
    return JSON.parse(rawValue);
  } catch {
    window.sessionStorage.removeItem(QUERY_PAGE_STATE_KEY);
    return null;
  }
}

function MiniSvgSignalPreview({ ecgData, spo2Data }) {
  const ecgPoints = ecgData
    ? ecgData.slice(0, 80).map((v, i) => `${(i / 80) * 260},${35 - v * 20}`).join(" ")
    : "";

  const spo2Points = spo2Data
    ? spo2Data.slice(0, 80).map((v, i) => `${(i / 80) * 260},${70 - ((v - 80) / 20) * 25}`).join(" ")
    : "";

  return (
    <Box sx={{ width: 280, height: 80, bg: "background.paper", borderRadius: 1, border: "1px solid rgba(255,255,255,0.1)", p: 1, overflow: "hidden" }}>
      <svg width="100%" height="100%" viewBox="0 0 260 80">
        <path d={`M ${ecgPoints}`} fill="none" stroke="#38bdf8" strokeWidth="1.5" />
        <path d={`M ${spo2Points}`} fill="none" stroke="#4ade80" strokeWidth="1.5" />
      </svg>
      <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: -1 }}>
        <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 700 }}>— ECG Lead II</Typography>
        <Typography variant="caption" sx={{ color: "#4ade80", fontWeight: 700 }}>— SpO2 Signal</Typography>
      </Stack>
    </Box>
  );
}

export function PatientQueryEcgPulseOximeterPage() {
  const savedPageState = getInitialPageState();
  const [query, setQuery] = useState(savedPageState?.query || "PT-1001");
  const [patient, setPatient] = useState(() => findPatientById(savedPageState?.query || "PT-1001"));
  const [expandedExaminationId, setExpandedExaminationId] = useState(savedPageState?.expandedExaminationId || "");
  const [resultSize, setResultSize] = useState(savedPageState?.resultSize || 10);
  const [currentPage, setCurrentPage] = useState(savedPageState?.currentPage || 1);
  const [examinationSearch, setExaminationSearch] = useState(savedPageState?.examinationSearch || "");
  const [sortConfig, setSortConfig] = useState(savedPageState?.sortConfig || { key: "date", direction: "desc" });
  const [dateRange, setDateRange] = useState(() => ({
    start: normalizeInputDateValue(savedPageState?.dateRange?.start || ""),
    end: normalizeInputDateValue(savedPageState?.dateRange?.end || "")
  }));

  window.sessionStorage.setItem(
    QUERY_PAGE_STATE_KEY,
    JSON.stringify({
      query,
      expandedExaminationId,
      resultSize,
      currentPage,
      examinationSearch,
      sortConfig,
      dateRange
    })
  );

  function handleSubmit(event) {
    event.preventDefault();
    const actionLog = logSimpleAction(
      `Patient Query (ECG+PO): ${query}`,
      ActionTypes.PATIENT_QUERY,
      `Searching for patient with ID ${query} for ECG & Pulse Oximeter review`,
      { patientId: query }
    );
    try {
      const found = findPatientById(query);
      setPatient(found);
      if (!found) {
        notifyUserError("No patient was found for this ID.");
        completeAction(actionLog.id, "FAILED");
      } else {
        completeAction(actionLog.id, "SUCCEEDED");
      }
    } catch {
      completeAction(actionLog.id, "FAILED");
      notifyUserError("Error during patient query");
    }
    setExpandedExaminationId("");
    setCurrentPage(1);
  }

  const filteredExaminations = useMemo(() => {
    if (!patient || !patient.ecgPulseOximeterExaminations) return [];
    const normalizedSearch = examinationSearch.trim().toLowerCase();
    const startDate = parseDisplayDate(dateRange.start);
    const endDate = parseDisplayDate(dateRange.end);
    const inclusiveEndDate = endDate ? getEndOfDay(endDate) : null;

    return [...patient.ecgPulseOximeterExaminations]
      .filter((examination) => examination.id.toLowerCase().includes(normalizedSearch))
      .filter((examination) => {
        const examDate = parseExamDate(examination.date);
        if (startDate && examDate < startDate) return false;
        if (inclusiveEndDate && examDate > inclusiveEndDate) return false;
        return true;
      })
      .sort((left, right) => {
        let comparison = 0;
        if (sortConfig.key === "date") {
          comparison = parseExamDate(left.date) - parseExamDate(right.date);
        } else if (sortConfig.key === "id") {
          comparison = left.id.localeCompare(right.id);
        }
        return sortConfig.direction === "asc" ? comparison : -comparison;
      });
  }, [patient, examinationSearch, dateRange, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredExaminations.length / resultSize));
  const paginatedExaminations = useMemo(() => {
    const startIndex = (currentPage - 1) * resultSize;
    return filteredExaminations.slice(startIndex, startIndex + resultSize);
  }, [filteredExaminations, currentPage, resultSize]);

  function handleStartExamination(examinationId) {
    if (!patient) return;
    resetExaminationWorkflowSession(patient.id, examinationId);
    resetWorkflowAfterStep(patient.id, examinationId, 0);
    setActiveWorkflowContext({
      patientId: patient.id,
      examinationId,
      reportId: "REP-EPO-3001"
    });
  }

  return (
    <Stack spacing={4} className="page-container">
      <Box sx={{ textAlign: "center", py: 1 }}>
        <Typography variant="h3">Integrated ECG & Pulse Oximeter Query</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Query patient records for simultaneous ECG Lead II and SpO2 signal analysis.
        </Typography>
      </Box>

      <Paper variant="outlined" sx={{ p: 3.5, borderRadius: 3 }}>
        <Box component="form" onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField
                fullWidth
                label="Enter Patient ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. PT-1001"
              />
              <Button type="submit" variant="contained" size="large" startIcon={<SearchRoundedIcon />} sx={{ px: 4, minWidth: 150 }}>
                Query
              </Button>
            </Stack>

            <Typography variant="caption" color="text.secondary">
              Try demo patient IDs: <strong>PT-1001</strong> or <strong>PT-1002</strong>.
            </Typography>
          </Stack>
        </Box>
      </Paper>

      {patient ? (
        <Stack spacing={3}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems="center" spacing={2}>
                <Box>
                  <Typography variant="h5" fontWeight={700}>{patient.name}</Typography>
                  <Typography color="text.secondary" variant="body2">
                    ID: {patient.id} | Age: {patient.age} | Total Dual Signal Exams: {patient.ecgPulseOximeterExaminations?.length || 0}
                  </Typography>
                </Box>
                <Chip icon={<FavoriteRoundedIcon />} label="Synchronous ECG & SpO2 Active" color="primary" variant="outlined" />
              </Stack>
            </CardContent>
          </Card>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2 }}>
            <Stack spacing={2}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between">
                <TextField
                  size="small"
                  label="Search Examination ID"
                  value={examinationSearch}
                  onChange={(e) => setExaminationSearch(e.target.value)}
                  sx={{ minWidth: 220 }}
                />
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    size="small"
                    type="date"
                    label="Start Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                  />
                  <TextField
                    size="small"
                    type="date"
                    label="End Date"
                    slotProps={{ inputLabel: { shrink: true } }}
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                  />
                  <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                      value={`${sortConfig.key}-${sortConfig.direction}`}
                      label="Sort By"
                      onChange={(e) => {
                        const [key, direction] = e.target.value.split("-");
                        setSortConfig({ key, direction });
                      }}
                    >
                      <MenuItem value="date-desc">Newest First</MenuItem>
                      <MenuItem value="date-asc">Oldest First</MenuItem>
                      <MenuItem value="id-asc">ID A-Z</MenuItem>
                      <MenuItem value="id-desc">ID Z-A</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Stack>

              <TableContainer component={Paper} variant="outlined">
                <Table size="medium">
                  <TableHead>
                    <TableRow>
                      <TableCell width={50} />
                      <TableCell><strong>Examination ID</strong></TableCell>
                      <TableCell><strong>Recording Date</strong></TableCell>
                      <TableCell><strong>Avg HR (bpm)</strong></TableCell>
                      <TableCell><strong>Min SpO2 (%)</strong></TableCell>
                      <TableCell align="right"><strong>Action</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedExaminations.map((exam) => {
                      const isExpanded = expandedExaminationId === exam.id;
                      return (
                        <Fragment key={exam.id}>
                          <TableRow hover>
                            <TableCell>
                              <IconButton
                                size="small"
                                onClick={() => setExpandedExaminationId(isExpanded ? "" : exam.id)}
                              >
                                {isExpanded ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                              </IconButton>
                            </TableCell>
                            <TableCell><Typography fontWeight={600}>{exam.id}</Typography></TableCell>
                            <TableCell>{formatExamDate(exam.date)}</TableCell>
                            <TableCell><Chip label={`${exam.avgHeartRate || 125} bpm`} size="small" color="info" variant="outlined" /></TableCell>
                            <TableCell><Chip label={`${exam.minSpo2 || 88}%`} size="small" color={exam.minSpo2 < 85 ? "error" : "success"} /></TableCell>
                            <TableCell align="right">
                              <Button
                                component={Link}
                                to={`/preprocessing-ecg-pulse-oximeter/${patient.id}/${exam.id}`}
                                variant="contained"
                                size="small"
                                onClick={() => handleStartExamination(exam.id)}
                              >
                                Analyze Dual Signals
                              </Button>
                            </TableCell>
                          </TableRow>

                          <TableRow>
                            <TableCell colSpan={6} sx={{ py: 0, borderBottom: isExpanded ? undefined : "none" }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 2, px: 3, bg: "action.hover" }}>
                                  <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems="center">
                                    <MiniSvgSignalPreview ecgData={exam.ecgSignalData} spo2Data={exam.spo2SignalData} />
                                    <Box>
                                      <Typography variant="subtitle2" fontWeight={700}>Synchronous Signal Preview</Typography>
                                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                        Lead II ECG and continuous SpO2 sampling rate: 250 Hz.
                                        Signal duration: 2 hours continuous recording.
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>

              {totalPages > 1 ? (
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="text.secondary">
                    Showing page {currentPage} of {totalPages} ({filteredExaminations.length} records)
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      size="small"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      size="small"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Next
                    </Button>
                  </Stack>
                </Stack>
              ) : null}
            </Stack>
          </Paper>
        </Stack>
      ) : null}
    </Stack>
  );
}
