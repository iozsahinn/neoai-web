import axios from "axios";
//TODO:remove
import { auditEntries, demoUsers, ecgPulseOximeterReport, patients, pulseOximeterReport } from "../data/mockData";

const mockReports = [
  {
    id: "REP-2001",
    patientId: "PT-1001",
    examinationId: "Exam_1001",
    title: "NeoAi LUS Assistant",
    summary: "Multiregional B-line burden is present, with the highest loss of aeration in region R3.",
    findings: [
      "Selected 6 representative frames, one per region.",
      "Applied denoise and contrast normalization before inference.",
      "Highest anomaly probability observed in region R3."
    ],
    confidence: "%89",
    exportedFormats: ["PDF", "DOCX"],
    reportDate: "2026-04-08 10:15",
    institution: "NeoAI Research Hospital",
    department: "NICU / Pediatric Radiology",
    requestedBy: "Dr. Elif Kaya",
    reviewedBy: "Dr. Elif Kaya",
    dateOfBirth: "2026-02-18",
    gestationalAge: "34 weeks",
    birthWeight: "2.12 kg",
    postnatalAge: "12 days",
    clinic: "NICU",
    bedNumber: "B-12",
    softwareVersion: "NeoAI LUS Assistant v1.0",
    indication: "Respiratory distress follow-up in neonatal intensive care.",
    technique: "Bedside lung ultrasound evaluation across six lung regions with AI-assisted frame selection and scoring.",
    clinicalInterpretation:
      "The AI pattern is most compatible with moderate diffuse aeration loss, most pronounced in the right anterior upper region. Clinical correlation and repeat bedside assessment are recommended.",
    recommendation:
      "Correlate with oxygen requirement, blood gas findings, and repeat ultrasound if respiratory support changes.",
    doctorCommentary:
      "AI findings are consistent with bedside impression. No immediate evidence of tension physiology on the reviewed clips.",
    finalDiagnosis: "Moderate diffuse aeration loss, most pronounced in the right upper anterior region.",
    treatmentRecommendation: "Correlate with oxygen requirement and bedside examination findings.",
    followUpRecommendation: "Repeat lung ultrasound if respiratory support changes or clinical status worsens."
  },
  pulseOximeterReport,
  ecgPulseOximeterReport
];

  
//TODO:connect to patient db
const API_HOSPITAL_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

//TODO:connect to patient db
const api_hospital = axios.create({
  baseURL: API_HOSPITAL_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function delay(milliseconds = 300) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

//TODO: rewrite everything with axios
export async function loginUser({ username, password }) {
  await delay();
  const user = demoUsers.find((candidate) => candidate.username === username && candidate.password === password);

  if (!user) {
    throw new Error("Invalid username or password.");
  }

  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    department: user.department,
    email: user.email
  };
}

export function findPatientById(patientId) {
  return patients.find((patient) => patient.id.toLowerCase() === patientId.trim().toLowerCase()) || null;
}

export function getExaminationByIds(patientId, examinationId) {
  const patient = findPatientById(patientId);
  return patient?.examinations.find((examination) => examination.id === examinationId) || null;
}

export function getReportById(reportId) {
  return mockReports.find((report) => report.id === reportId) || null;
}

export function getAuditEntries() {
  return auditEntries;
}
