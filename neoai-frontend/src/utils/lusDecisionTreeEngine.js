/**
 * Neonatal Lung Ultrasound (LUS) Decision Tree & Probabilistic Engine
 * Reference: Kurepa D, Zaghloul N, Watkins L, Liu J. Neonatal lung ultrasound exam guidelines.
 * J Perinatol. 2018 Jan;38(1):11-22.
 */

export const LUS_NODES = {
  lungSliding: {
    id: "lungSliding",
    label: "Lung sliding",
    description: "Visceral pleura sliding against parietal pleura (seashore / shimmer)"
  },
  aLinesSlidingPresent: {
    id: "aLinesSlidingPresent",
    label: "A lines (Sliding +)",
    description: "Horizontal reverberation artifacts indicating aerated lung"
  },
  bProfile: {
    id: "bProfile",
    label: "B profile with double lung point",
    description: "Multiple B-lines with transition zone between upper and lower lung fields"
  },
  aLinesSlidingAbsent: {
    id: "aLinesSlidingAbsent",
    label: "A lines (Sliding -)",
    description: "Presence of A-lines in the absence of pleural sliding"
  },
  lungPoint: {
    id: "lungPoint",
    label: "Lung point",
    description: "Boundary where normal sliding alternates with pneumothorax pattern"
  },
  anechoicZone: {
    id: "anechoicZone",
    label: "Anechoic zone +/- Jellyfish, Sinusoid, Quad sign",
    description: "Fluid accumulation in pleural cavity with typical acoustic signs"
  },
  bilateralConsolidation: {
    id: "bilateralConsolidation",
    label: "Bilateral / uniform consolidation",
    description: "Subpleural or diffuse consolidation across bilateral lung regions"
  },
  shredSign: {
    id: "shredSign",
    label: "Shred sign and/or dynamic air/fluid bronchograms",
    description: "Fractal margin between aerated and consolidated lung with branching dynamic bronchograms"
  }
};

export const LUS_DIAGNOSES = [
  {
    id: "normal",
    name: "Normal lung",
    badge: "Normal",
    color: "#10b981", // Emerald
    pathDescription: "Lung sliding (+) → A lines (+)",
    severityNote: "Normal aeration pattern with preserved lung sliding and regular horizontal A-lines. No consolidations or interstitial edema.",
    isPathology: false
  },
  {
    id: "ttn",
    name: "TTN (Transient Tachypnea)",
    badge: "TTN",
    color: "#8b5cf6", // Purple
    pathDescription: "Lung sliding (+) → A lines (-) → B profile w/ double lung point (+)",
    severityNote: "Severity ranges from mild B-profile +/- 'double lung point' to 'white lung'. Typical of delayed fetal lung liquid clearance.",
    isPathology: true
  },
  {
    id: "mas",
    name: "MAS (Meconium Aspiration)",
    badge: "MAS",
    color: "#f59e0b", // Amber
    pathDescription: "Lung sliding (+) → A lines (-) → B profile w/ double lung point (-)",
    severityNote: "Severity ranges from nonspecific B-profile to irregular subpleural consolidations with air bronchograms.",
    isPathology: true
  },
  {
    id: "confirmed_ptx",
    name: "Confirmed Pneumothorax",
    badge: "Confirmed PTX",
    color: "#ef4444", // Red
    pathDescription: "Lung sliding (-) → A lines (+) → Lung point (+)",
    severityNote: "Pathognomonic finding: Pathological absence of sliding with definitive lung point identifying pneumothorax boundary.",
    isPathology: true
  },
  {
    id: "possible_ptx",
    name: "Possible Pneumothorax (+ Stratosphere sign)",
    badge: "Possible PTX",
    color: "#ec4899", // Pink
    pathDescription: "Lung sliding (-) → A lines (+) → Lung point (-)",
    severityNote: "High suspicion: Lung sliding absent with Stratosphere/Barcode sign on M-mode, but lung point not captured in scanned zones.",
    isPathology: true
  },
  {
    id: "pleural_effusion",
    name: "Pleural effusion",
    badge: "Pleural Effusion",
    color: "#06b6d4", // Cyan
    pathDescription: "Lung sliding (-) → A lines (-) → Anechoic zone (+)",
    severityNote: "Pleural fluid collection showing anechoic space with Jellyfish sign, sinusoid respiratory variation, or quad sign.",
    isPathology: true
  },
  {
    id: "rds",
    name: "RDS (Respiratory Distress Syndrome)",
    badge: "RDS",
    color: "#6366f1", // Indigo
    pathDescription: "Lung sliding (-) → A lines (-) → Anechoic (-) → Bilateral consolidation (+)",
    severityNote: "Severity ranges from B-profile to 'white lung' with static air bronchograms and lung pulse sign.",
    isPathology: true
  },
  {
    id: "pneumonia",
    name: "Pneumonia",
    badge: "Pneumonia",
    color: "#f97316", // Orange
    pathDescription: "Lung sliding (-) → A lines (-) → Anechoic (-) → Bilateral (-) → Shred sign (+)",
    severityNote: "Irregular pleura present. B-profile present if reactive edema. (NOTE: 25% of pneumonias may have lung sliding present; deeper pneumonias may be missed).",
    isPathology: true
  },
  {
    id: "atelectasis",
    name: "Atelectasis",
    badge: "Atelectasis",
    color: "#64748b", // Slate
    pathDescription: "Lung sliding (-) → A lines (-) → Anechoic (-) → Bilateral (-) → Shred sign (-)",
    severityNote: "Severity ranges from consolidation with static air bronchograms to 'white lung' with lung pulse sign in complete atelectasis.",
    isPathology: true
  }
];

export const DEFAULT_AI_PROBABILITIES = {
  lungSliding: 0.22,               // 22% sliding present, 78% absent
  aLinesSlidingPresent: 0.15,      // If sliding +, 15% A-lines +, 85% A-lines -
  bProfile: 0.70,                  // If sliding + & A-lines -, 70% B-profile +, 30% MAS
  aLinesSlidingAbsent: 0.12,       // If sliding -, 12% A-lines +, 88% A-lines -
  lungPoint: 0.65,                 // If sliding - & A-lines +, 65% lung point +, 35% possible
  anechoicZone: 0.10,              // If sliding - & A-lines -, 10% effusion +, 90% consolidation search
  bilateralConsolidation: 0.78,    // If no effusion, 78% bilateral uniform (RDS), 22% shred sign search
  shredSign: 0.72                  // If non-uniform consolidation, 72% pneumonia, 28% atelectasis
};

export const PRESET_SCENARIOS = {
  rds: {
    id: "rds",
    label: "RDS (Surfactant Deficiency / Hyaline Membrane)",
    values: {
      lungSliding: 0.08,
      aLinesSlidingPresent: 0.10,
      bProfile: 0.20,
      aLinesSlidingAbsent: 0.05,
      lungPoint: 0.05,
      anechoicZone: 0.04,
      bilateralConsolidation: 0.92,
      shredSign: 0.40
    }
  },
  normal: {
    id: "normal",
    label: "Normal Neonatal Aeration",
    values: {
      lungSliding: 0.96,
      aLinesSlidingPresent: 0.94,
      bProfile: 0.10,
      aLinesSlidingAbsent: 0.15,
      lungPoint: 0.02,
      anechoicZone: 0.02,
      bilateralConsolidation: 0.05,
      shredSign: 0.05
    }
  },
  ttn: {
    id: "ttn",
    label: "TTN (Transient Wet Lung)",
    values: {
      lungSliding: 0.90,
      aLinesSlidingPresent: 0.08,
      bProfile: 0.88,
      aLinesSlidingAbsent: 0.10,
      lungPoint: 0.05,
      anechoicZone: 0.05,
      bilateralConsolidation: 0.20,
      shredSign: 0.15
    }
  },
  ptx: {
    id: "ptx",
    label: "Pneumothorax (Tension / Air Leak)",
    values: {
      lungSliding: 0.02,
      aLinesSlidingPresent: 0.10,
      bProfile: 0.10,
      aLinesSlidingAbsent: 0.95,
      lungPoint: 0.82,
      anechoicZone: 0.02,
      bilateralConsolidation: 0.05,
      shredSign: 0.10
    }
  },
  pneumonia: {
    id: "pneumonia",
    label: "Neonatal Pneumonia (Consolidation + Shred)",
    values: {
      lungSliding: 0.18,
      aLinesSlidingPresent: 0.10,
      bProfile: 0.30,
      aLinesSlidingAbsent: 0.06,
      lungPoint: 0.05,
      anechoicZone: 0.12,
      bilateralConsolidation: 0.15,
      shredSign: 0.89
    }
  }
};

/**
 * Calculates the exact chain probability distribution for all 9 leaf diagnoses.
 * Mathematical property: sum of all probabilities is exactly 1.0 (100%).
 */
export function computeDiagnosisProbabilities(nodeProbs = DEFAULT_AI_PROBABILITIES) {
  const pLS_pos = Math.max(0, Math.min(1, nodeProbs.lungSliding));
  const pLS_neg = 1 - pLS_pos;

  // Branch 1: Lung sliding Present
  const pA_pos_given_LS_pos = Math.max(0, Math.min(1, nodeProbs.aLinesSlidingPresent));
  const pA_neg_given_LS_pos = 1 - pA_pos_given_LS_pos;

  const pB_pos = Math.max(0, Math.min(1, nodeProbs.bProfile));
  const pB_neg = 1 - pB_pos;

  const pNormal = pLS_pos * pA_pos_given_LS_pos;
  const pTTN = pLS_pos * pA_neg_given_LS_pos * pB_pos;
  const pMAS = pLS_pos * pA_neg_given_LS_pos * pB_neg;

  // Branch 2: Lung sliding Absent
  const pA_pos_given_LS_neg = Math.max(0, Math.min(1, nodeProbs.aLinesSlidingAbsent));
  const pA_neg_given_LS_neg = 1 - pA_pos_given_LS_neg;

  const pLP_pos = Math.max(0, Math.min(1, nodeProbs.lungPoint));
  const pLP_neg = 1 - pLP_pos;

  const pConfirmedPTX = pLS_neg * pA_pos_given_LS_neg * pLP_pos;
  const pPossiblePTX = pLS_neg * pA_pos_given_LS_neg * pLP_neg;

  const pAZ_pos = Math.max(0, Math.min(1, nodeProbs.anechoicZone));
  const pAZ_neg = 1 - pAZ_pos;

  const pPleuralEffusion = pLS_neg * pA_neg_given_LS_neg * pAZ_pos;

  const pBC_pos = Math.max(0, Math.min(1, nodeProbs.bilateralConsolidation));
  const pBC_neg = 1 - pBC_pos;

  const pRDS = pLS_neg * pA_neg_given_LS_neg * pAZ_neg * pBC_pos;

  const pSS_pos = Math.max(0, Math.min(1, nodeProbs.shredSign));
  const pSS_neg = 1 - pSS_pos;

  const pPneumonia = pLS_neg * pA_neg_given_LS_neg * pAZ_neg * pBC_neg * pSS_pos;
  const pAtelectasis = pLS_neg * pA_neg_given_LS_neg * pAZ_neg * pBC_neg * pSS_neg;

  const resultsMap = {
    normal: pNormal,
    ttn: pTTN,
    mas: pMAS,
    confirmed_ptx: pConfirmedPTX,
    possible_ptx: pPossiblePTX,
    pleural_effusion: pPleuralEffusion,
    rds: pRDS,
    pneumonia: pPneumonia,
    atelectasis: pAtelectasis
  };

  const rankedResults = LUS_DIAGNOSES.map((diag) => {
    const prob = resultsMap[diag.id] || 0;
    return {
      ...diag,
      probability: prob,
      percentage: Math.round(prob * 100),
      formattedPercent: `${(prob * 100).toFixed(1)}%`
    };
  }).sort((a, b) => b.probability - a.probability);

  return {
    resultsMap,
    rankedResults,
    topDiagnosis: rankedResults[0],
    differentialDiagnoses: rankedResults.slice(1, 4),
    checksum: Object.values(resultsMap).reduce((sum, val) => sum + val, 0)
  };
}
