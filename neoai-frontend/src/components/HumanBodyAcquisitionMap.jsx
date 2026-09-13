import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import humanAnatomyImg from "../assets/human_anatomy.jpg";

export function HumanBodyAcquisitionMap({
  handSpo2Value = 98,
  handSqi = 96,
  footSpo2Value = 97,
  footSqi = 92,
  ecgHr = 74
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        height: "100%",
        minHeight: 520,
        borderRadius: 2,
        background: "radial-gradient(ellipse at center, rgba(15, 23, 42, 0.95) 0%, rgba(2, 6, 23, 0.98) 100%)",
        border: "1px solid rgba(56, 189, 248, 0.3)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Holographic Scanlines */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage: "linear-gradient(to bottom, transparent 95%, rgba(56, 189, 248, 0.04) 100%)",
          backgroundSize: "100% 12px",
          pointerEvents: "none"
        }}
      />

      {/* Header Title */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1, zIndex: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={800} sx={{ color: "#38bdf8", letterSpacing: 0.5, textTransform: "uppercase", fontSize: 12 }}>
            Anatomical Acquisition Map
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 11 }}>
            Limb Sensor Placement & Signal Vector Flow
          </Typography>
        </Box>
        <Chip
          label="Live Telemetry"
          size="small"
          color="success"
          variant="outlined"
          sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
        />
      </Stack>

      {/* Body Vector & Anatomy Image Container */}
      <Box sx={{ flex: 1, position: "relative", display: "flex", justifyContent: "center", alignItems: "center", my: 1, zIndex: 1 }}>
        {/* Realistic 3D Human Muscular Anatomy Figure Image */}
        <img
          src={humanAnatomyImg}
          alt="Human Muscular Anatomy Model"
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            maxHeight: 520,
            objectFit: "contain",
            transform: "translateY(-36px)",
            filter: "brightness(1.08) contrast(1.15) drop-shadow(0 0 18px rgba(56, 189, 248, 0.35))",
            mixBlendMode: "screen",
            opacity: 0.95,
            pointerEvents: "none"
          }}
        />

        <svg
          viewBox="0 0 260 520"
          style={{ width: "100%", height: "100%", maxHeight: 520, position: "relative", zIndex: 2, filter: "drop-shadow(0 0 10px rgba(56, 189, 248, 0.15))" }}
        >
          <defs>
            {/* Arrow Marker Green (Hand) */}
            <marker id="arrow-hand" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#4ade80" />
            </marker>
            {/* Arrow Marker Purple (Foot) */}
            <marker id="arrow-foot" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#c084fc" />
            </marker>
            {/* Arrow Marker Cyan (ECG) */}
            <marker id="arrow-ecg" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>

            {/* Dash animation for vector flow */}
            <style>{`
              @keyframes dashFlow {
                to {
                  stroke-dashoffset: -20;
                }
              }
              @keyframes pulseRing {
                0% { r: 6px; opacity: 0.9; }
                100% { r: 22px; opacity: 0; }
              }
              .pulse-ring-hand { animation: pulseRing 1.8s infinite ease-out; }
              .pulse-ring-foot { animation: pulseRing 1.8s infinite ease-out 0.4s; }
              .pulse-ring-ecg { animation: pulseRing 1.8s infinite ease-out 0.8s; }
              .flow-path { stroke-dasharray: 6 4; animation: dashFlow 1.2s linear infinite; }
            `}</style>
          </defs>

          {/* Background Grid & Radar Circles */}
          <circle cx="130" cy="214" r="220" fill="none" stroke="rgba(56, 189, 248, 0.05)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="130" cy="214" r="140" fill="none" stroke="rgba(56, 189, 248, 0.08)" strokeWidth="1" />
          <line x1="130" y1="20" x2="130" y2="500" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 4" />
          <line x1="20" y1="214" x2="240" y2="214" stroke="rgba(255, 255, 255, 0.05)" strokeDasharray="2 4" />

          {/* Futuristic Target Reticles */}
          <g fill="none" opacity="0.7">
            <circle cx="118" cy="110" r="14" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="58" cy="225" r="14" stroke="#4ade80" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx="104" cy="435" r="14" stroke="#c084fc" strokeWidth="1" strokeDasharray="3 3" />
          </g>

          {/* --- SENSOR ACQUISITION NODES & PULSE ANIMATIONS --- */}

          {/* 1. CHEST ECG LEAD II NODE */}
          <g>
            <circle cx="118" cy="110" class="pulse-ring-ecg" fill="none" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="118" cy="110" r="5" fill="#38bdf8" />
            <circle cx="118" cy="110" r="9" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
            <rect x="78" y="78" width="80" height="20" rx="4" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" strokeWidth="1" />
            <text x="118" y="92" fill="#38bdf8" fontSize="9.5" fontWeight="bold" textAnchor="middle">
              ECG Lead II
            </text>
          </g>

          {/* 2. HAND SPO2 ACQUISITION NODE (Upper Limb) */}
          <g>
            <circle cx="58" cy="225" class="pulse-ring-hand" fill="none" stroke="#4ade80" strokeWidth="2" />
            <circle cx="58" cy="225" r="6" fill="#4ade80" />
            <circle cx="58" cy="225" r="11" fill="none" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Hand Node Callout Card */}
            <rect x="14" y="165" width="76" height="34" rx="5" fill="rgba(6, 78, 59, 0.9)" stroke="#4ade80" strokeWidth="1.5" />
            <text x="52" y="179" fill="#4ade80" fontSize="9" fontWeight="800" textAnchor="middle">HAND POX</text>
            <text x="52" y="192" fill="#ffffff" fontSize="9.5" fontWeight="700" textAnchor="middle">{handSpo2Value}% SpO2</text>
          </g>

          {/* 3. FOOT SPO2 ACQUISITION NODE (Lower Limb) */}
          <g>
            <circle cx="104" cy="435" class="pulse-ring-foot" fill="none" stroke="#c084fc" strokeWidth="2" />
            <circle cx="104" cy="435" r="6" fill="#c084fc" />
            <circle cx="104" cy="435" r="11" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="3 2" />

            {/* Foot Node Callout Card */}
            <rect x="66" y="375" width="76" height="34" rx="5" fill="rgba(88, 28, 135, 0.9)" stroke="#c084fc" strokeWidth="1.5" />
            <text x="104" y="389" fill="#c084fc" fontSize="9" fontWeight="800" textAnchor="middle">FOOT POX</text>
            <text x="104" y="402" fill="#ffffff" fontSize="9.5" fontWeight="700" textAnchor="middle">{footSpo2Value}% SpO2</text>
          </g>

          {/* --- DIRECTIONAL CONNECTING ARROWS POINTING TO SIGNAL RESULT GRAPHS --- */}

          {/* Arrow 1: Chest Node -> Channel 1 (ECG Graph) */}
          <path
            d="M 123 110 C 160 110, 200 85, 252 80"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            class="flow-path"
            markerEnd="url(#arrow-ecg)"
          />

          {/* Arrow 2: Hand Node -> Channel 2A (Hand PPG Graph) */}
          <path
            d="M 66 225 C 120 225, 175 240, 252 245"
            fill="none"
            stroke="#4ade80"
            strokeWidth="2.5"
            class="flow-path"
            markerEnd="url(#arrow-hand)"
          />

          {/* Arrow 3: Foot Node -> Channel 2B (Foot PPG Graph) */}
          <path
            d="M 112 435 C 160 435, 205 425, 252 425"
            fill="none"
            stroke="#c084fc"
            strokeWidth="2.5"
            class="flow-path"
            markerEnd="url(#arrow-foot)"
          />
        </svg>
      </Box>

      {/* Footer Limb Acquisition Key */}
      <Stack direction="row" justifyContent="space-around" alignItems="center" sx={{ pt: 1, borderTop: "1px stroke rgba(255,255,255,0.1)", zIndex: 1 }}>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#38bdf8" }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
            Chest Node
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#4ade80" }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
            Hand Site ({handSqi}% SQI)
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#c084fc" }} />
          <Typography variant="caption" sx={{ fontSize: 10, color: "text.secondary" }}>
            Foot Site ({footSqi}% SQI)
          </Typography>
        </Stack>
      </Stack>
    </Paper>
  );
}
