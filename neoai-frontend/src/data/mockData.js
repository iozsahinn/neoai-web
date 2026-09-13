import sampleThumbnail from "./lus_sample_thumbnail.jpg";
import r1 from "./r1.mp4";
import r2 from "./r2.mp4";
import r3 from "./r3.mp4";
import r4 from "./r4.mp4";
import r5 from "./r5.mp4";
import r6 from "./r6.mp4";

export const demoUsers = [
  {
    id: "doctor-elif",
    username: "doctor",
    password: "doctor123",
    fullName: "Dr. Elif Kaya",
    role: "DOCTOR",
    department: "Radiology",
    email: "elif.kaya@hospital.local",
    active: true
  },
  {
    id: "admin-deniz",
    username: "admin",
    password: "admin123",
    fullName: "Deniz Aydin",
    role: "ADMIN",
    department: "System Administration",
    email: "deniz.aydin@hospital.local",
    active: true
  }
];

function padNumber(value) {
  return String(value).padStart(4, "0");
}

function buildDateString(index) {
  const month = ((index - 1) % 12) + 1;
  const day = ((index * 3 - 1) % 28) + 1;
  const hour = 8 + (index % 9);
  const minute = (index * 7) % 60;

  return `2026-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function createVideoSet(seed) {
  return [
    {
      name: `VID-${seed}01`,
      region: "r1",
      duration: "00:18",
      thumbnail: sampleThumbnail,
      videoUrl: r1,
      comment: "Left lobe sweep",
      rdsScore: 3
    },
    {
      name: `VID-${seed}02`,
      region: "r2",
      duration: "00:22",
      thumbnail: sampleThumbnail,
      videoUrl: r2,
      comment: "Upper pole focus",
      rdsScore: 2
    },
    {
      name: `VID-${seed}03`,
      region: "r3",
      duration: "00:20",
      thumbnail: sampleThumbnail,
      videoUrl: r3,
      comment: "Suspicious nodule view",
      rdsScore: 3
    },
    {
      name: `VID-${seed}04`,
      region: "r4",
      duration: "00:25",
      thumbnail: sampleThumbnail,
      videoUrl: r4,
      comment: "Transverse section",
      rdsScore: 2
    },
    {
      name: `VID-${seed}05`,
      region: "r5",
      duration: "00:17",
      thumbnail: sampleThumbnail,
      videoUrl: r5,
      comment: "Lower margin pass",
      rdsScore: 2
    },
    {
      name: `VID-${seed}06`,
      region: "r6",
      duration: "00:21",
      thumbnail: sampleThumbnail,
      videoUrl: r6,
      comment: "Right lobe close-up",
      rdsScore: 1
    }
  ];
}

function createExamination(index) {
  return {
    id: `Exam_${padNumber(1000 + index)}`,
    date: buildDateString(index),
    status: index % 5 === 0 ? "Archived" : "Ready for review",
    videos: createVideoSet(padNumber(index))
  };
}

function generateSignalData(length = 200) {
  const data = [];
  const beatPeriod = 22; // ~110 bpm cardiac cycle at 500 Hz sampling

  for (let i = 0; i < length; i++) {
    const phase = (i % beatPeriod) / beatPeriod; // Phase 0.0 to 1.0 per heart beat

    // 1. Systolic Peak: Rapid steep cardiac ejection climb to main peak at phase ~0.22
    const systolicPeak = Math.exp(-Math.pow((phase - 0.22) / 0.07, 2)) * 1.0;

    // 2. Dicrotic Notch: Aortic valve closure rebound reflection notch at phase ~0.46
    const dicroticNotch = Math.exp(-Math.pow((phase - 0.46) / 0.06, 2)) * 0.38;

    // 3. Diastolic Runoff: Smooth exponential relaxation runoff back to baseline
    const diastolicRunoff = Math.exp(-phase * 1.8) * 0.12;

    // Composite physiological PPG pulse wave
    const ppgPulse = systolicPeak + dicroticNotch + diastolicRunoff;

    // Low-frequency respiratory baseline modulation & subtle sensor noise
    const respiratoryWander = Math.sin((i / 200) * 2 * Math.PI * 2) * 0.06;
    const noise = (Math.random() - 0.5) * 0.02;

    const val = ppgPulse + respiratoryWander + noise;
    data.push(parseFloat(val.toFixed(3)));
  }
  return data;
}

function generateEcgSignalData(length = 200) {
  const data = [];
  for (let i = 0; i < length; i++) {
    const cycle = i % 20;
    let ecg = 0;
    if (cycle === 3) ecg = 0.25;
    else if (cycle === 4) ecg = 0.15;
    else if (cycle === 6) ecg = -0.2;
    else if (cycle === 8) ecg = 1.25;
    else if (cycle === 9) ecg = -0.4;
    else if (cycle === 13) ecg = 0.15;
    else if (cycle === 14) ecg = 0.35;
    else if (cycle === 15) ecg = 0.1;

    const baseline = Math.sin(i / 30) * 0.05;
    const noise = (Math.random() - 0.5) * 0.04;
    data.push(parseFloat((ecg + baseline + noise).toFixed(3)));
  }
  return data;
}

function createPulseOximeterExamination(index) {
  return {
    id: `PO_Exam_${padNumber(1000 + index)}`,
    date: buildDateString(index),
    signalData: generateSignalData()
  };
}

function createEcgPulseOximeterExamination(index) {
  return {
    id: `EPO_Exam_${padNumber(1000 + index)}`,
    date: buildDateString(index),
    spo2SignalData: generateSignalData(200),
    ecgSignalData: generateEcgSignalData(200),
    avgHeartRate: 124 + (index % 15),
    minSpo2: 82 + (index % 10)
  };
}

export const patients = [
  {
    id: "PT-1001",
    name: "Aylin Yilmaz",
    age: 47,
    examinations: Array.from({ length: 55 }, (_, index) => createExamination(index + 1)),
    pulseOximeterExaminations: Array.from({ length: 10 }, (_, index) => createPulseOximeterExamination(index + 1)),
    ecgPulseOximeterExaminations: Array.from({ length: 10 }, (_, index) => createEcgPulseOximeterExamination(index + 1))
  },
  {
    id: "PT-1002",
    name: "Kerem Demir",
    age: 55,
    examinations: Array.from({ length: 8 }, (_, index) => createExamination(index + 101)),
    pulseOximeterExaminations: Array.from({ length: 5 }, (_, index) => createPulseOximeterExamination(index + 201)),
    ecgPulseOximeterExaminations: Array.from({ length: 5 }, (_, index) => createEcgPulseOximeterExamination(index + 201))
  }
];


export const aiRegionResults = {
  r1: {
    region: "R1",
    image_quality: "acceptable",
    b_line_module: {
      count: 6,
      bounding_boxes: [
        { x: 110, y: 75, width: 40, height: 245, confidence: 0.94 },
        { x: 180, y: 80, width: 40, height: 230, confidence: 0.91 },
        { x: 250, y: 85, width: 40, height: 215, confidence: 0.9 }
      ]
    },
    rds_score_module: {
      score: 3
    }
  },
  r2: {
    region: "R2",
    image_quality: "acceptable",
    b_line_module: {
      count: 4,
      bounding_boxes: [
        { x: 90, y: 88, width: 36, height: 214, confidence: 0.9 },
        { x: 190, y: 78, width: 36, height: 236, confidence: 0.88 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r3: {
    region: "R3",
    image_quality: "acceptable",
    b_line_module: {
      count: 8,
      bounding_boxes: [
        { x: 72, y: 80, width: 38, height: 235, confidence: 0.95 },
        { x: 130, y: 82, width: 40, height: 240, confidence: 0.94 },
        { x: 205, y: 76, width: 41, height: 242, confidence: 0.92 },
        { x: 278, y: 84, width: 38, height: 224, confidence: 0.91 }
      ]
    },
    rds_score_module: {
      score: 3
    }
  },
  r4: {
    region: "R4",
    image_quality: "acceptable",
    b_line_module: {
      count: 3,
      bounding_boxes: [
        { x: 118, y: 92, width: 36, height: 194, confidence: 0.86 },
        { x: 234, y: 88, width: 36, height: 207, confidence: 0.84 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r5: {
    region: "R5",
    image_quality: "suboptimal",
    b_line_module: {
      count: 5,
      bounding_boxes: [
        { x: 96, y: 94, width: 39, height: 212, confidence: 0.89 },
        { x: 164, y: 91, width: 38, height: 207, confidence: 0.87 },
        { x: 258, y: 96, width: 38, height: 194, confidence: 0.85 }
      ]
    },
    rds_score_module: {
      score: 2
    }
  },
  r6: {
    region: "R6",
    image_quality: "acceptable",
    b_line_module: {
      count: 2,
      bounding_boxes: [
        { x: 140, y: 86, width: 38, height: 190, confidence: 0.8 },
        { x: 232, y: 94, width: 36, height: 188, confidence: 0.79 }
      ]
    },
    rds_score_module: {
      score: 1
    }
  }
};

export const pulseOximeterReport = {
  id: "REP-PO-2001",
  patientId: "PT-1001",
  examinationId: "PO_Exam_1001",
  title: "NeoAi Pulse Oximeter Assistant",
  summary: "Analysis of the SpO2 signal reveals multiple desaturation events consistent with intermittent hypoxia.",
  findings: [
    "Detected 8 significant desaturation events (drop > 4%).",
    "Average duration of desaturation events: 25 seconds.",
    "Lowest SpO2 recorded: 82%.",
    "Associated bradycardia detected during 3 of the events."
  ],
  confidence: "%92",
  exportedFormats: ["PDF", "DOCX"],
  reportDate: "2026-04-09 11:30",
  institution: "NeoAI Research Hospital",
  department: "NICU / Pulmonology",
  requestedBy: "Dr. Elif Kaya",
  reviewedBy: "Dr. Elif Kaya",
  dateOfBirth: "2026-02-18",
  gestationalAge: "34 weeks",
  birthWeight: "2.12 kg",
  postnatalAge: "13 days",
  clinic: "NICU",
  bedNumber: "B-12",
  softwareVersion: "NeoAI PO Assistant v1.0",
  indication: "Screening for apnea of prematurity and related events.",
  technique: "Continuous SpO2 monitoring over a 2-hour period with AI-assisted event detection.",
  clinicalInterpretation:
    "The AI findings are highly suggestive of moderate intermittent hypoxia. The pattern and frequency of events warrant clinical correlation for apnea of prematurity.",
  recommendation:
    "Correlate with clinical observation for apnea. Consider caffeine therapy if clinically indicated. Continuous cardiorespiratory monitoring is advised.",
  doctorCommentary:
    "AI analysis confirms clinical suspicion. The desaturation events are clear and require intervention.",
  finalDiagnosis: "Moderate intermittent hypoxia, likely secondary to apnea of prematurity.",
  treatmentRecommendation: "Initiate or adjust caffeine therapy. Ensure proper positioning.",
  followUpRecommendation: "Repeat 24-hour SpO2 monitoring to assess response to treatment."
};

export const ecgPulseOximeterReport = {
  id: "REP-EPO-3001",
  patientId: "PT-1001",
  examinationId: "EPO_Exam_1001",
  title: "NeoAi Integrated ECG & Pulse Oximeter Assistant",
  summary: "Synchronized multi-modal analysis shows temporal concordance between SpO2 desaturation episodes and sinus bradycardia (R-R interval prolongation).",
  findings: [
    "Detected 6 synchronized cardiorespiratory events where SpO2 dropped below 88% while heart rate decreased below 95 bpm.",
    "Maximum R-R interval recorded during desaturation: 1.12 seconds.",
    "Mean pulse transit time (PTT) variation: 145 ms during hypoxic onset.",
    "No acute ST-segment elevation or malignant ventricular arrhythmias identified."
  ],
  confidence: "%95",
  exportedFormats: ["PDF", "DOCX"],
  reportDate: "2026-04-10 14:15",
  institution: "NeoAI Research Hospital",
  department: "NICU / Pediatric Cardiology & Pulmonology",
  requestedBy: "Dr. Elif Kaya",
  reviewedBy: "Dr. Elif Kaya",
  dateOfBirth: "2026-02-18",
  gestationalAge: "34 weeks",
  birthWeight: "2.12 kg",
  postnatalAge: "14 days",
  clinic: "NICU",
  bedNumber: "B-12",
  softwareVersion: "NeoAI ECG+PO Assistant v1.0",
  indication: "Cardiorespiratory monitoring for sync-apnea and bradycardia of prematurity.",
  technique: "Continuous 2-channel synchronous ECG (Lead II) and SpO2 recording over a 2-hour window with multi-modal AI event alignment.",
  clinicalInterpretation:
    "Strong evidence of reflex bradycardia secondary to hypoxemia. The synchronized ECG-SpO2 pattern confirms central/mixed hypoxic episodes with transient vagal activation.",
  recommendation:
    "Maintain continuous multi-parameter monitoring. Consider positional adjustments and oxygen therapy titration. Evaluate for caffeine citrate therapy adjustment.",
  doctorCommentary:
    "Multi-modal AI alignment clearly demonstrates the temporal relationship between SpO2 drops and heart rate deceleration. Excellent diagnostic clarity.",
  finalDiagnosis: "Hypoxia-induced sinus bradycardia secondary to apnea of prematurity.",
  treatmentRecommendation: "Adjust respiratory support, optimize caffeine dosage, and monitor cardiorespiratory stability.",
  followUpRecommendation: "Repeat synchronized 24-hour ECG & SpO2 recording in 48 hours."
};


export const auditEntries = [
  {
    id: "AUD-1",
    actor: "Deniz Aydin",
    action: "Created user",
    target: "Dr. Aylin Aras",
    timestamp: "2026-04-01 09:10"
  },
  {
    id: "AUD-2",
    actor: "Dr. Elif Kaya",
    action: "Generated AI report",
    target: "EX-2026-041",
    timestamp: "2026-04-01 11:42"
  }
];
