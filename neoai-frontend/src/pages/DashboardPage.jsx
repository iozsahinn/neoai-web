import { Link } from "react-router-dom";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  Stack,
  Typography
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

const dataTypes = [
  {
    title: "Ultrasound",
    description: "Accessible now. Continue to patient query and examination review.",
    enabled: true,
    href: "/query",
    icon: <MonitorHeartRoundedIcon />
  },
  {
    title: "Pulse Oximeter",
    description: "Accessible now. Continue to patient query and examination review.",
    enabled: true,
    href: "/query-pulse-oximeter",
    icon: <MonitorHeartRoundedIcon />
  },
  {
    title: "ECG + Pulse Oximeter",
    description: "Integrated synchronous ECG & SpO2 multi-modal analysis.",
    enabled: true,
    href: "/query-ecg-pulse-oximeter",
    icon: <MonitorHeartRoundedIcon />
  },
  {
    title: "MRI",
    description: "You do not have permission to use this assistant.",
    enabled: false,
    icon: <LockRoundedIcon />
  },
  {
    title: "CT",
    description: "You do not have permission to use this assistant.",
    enabled: false,
    icon: <LockRoundedIcon />
  }
];

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <Stack spacing={4} sx={{ maxWidth: 1100, mx: "auto" }}>
      <Box sx={{ textAlign: "center", py: 2 }}>
        <Typography variant="h3">Choose an AI Assistant to Get Started</Typography>
      </Box>

      <Grid container spacing={2.5}>
        {dataTypes.map((item) => (
          <Grid key={item.title} size={{ xs: 12, md: 6, lg: 4 }}>
            <Card
              sx={{
                minHeight: 210,
                opacity: item.enabled ? 1 : 0.68,
                transition: "transform 0.18s ease, border-color 0.18s ease, background-color 0.18s ease",
                "&:hover": item.enabled
                  ? {
                      transform: "translateY(-2px)",
                      borderColor: "rgba(125, 211, 252, 0.32)",
                      backgroundColor: "rgba(56, 189, 248, 0.08)"
                    }
                  : undefined
              }}
            >
              <CardActionArea
                component={item.enabled ? Link : "div"}
                to={item.enabled ? item.href : undefined}
                sx={{
                  height: "100%",
                  alignItems: "stretch",
                  pointerEvents: item.enabled ? "auto" : "none"
                }}
              >
                <CardContent sx={{ display: "grid", gap: 1.5, alignContent: "start", p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Chip
                      label={item.enabled ? "Available" : "Unavailable"}
                      color={item.enabled ? "success" : "default"}
                      size="small"
                      sx={{ fontWeight: 700 }}
                    />
                    <Box sx={{ color: item.enabled ? "primary.main" : "text.secondary", display: "inline-flex" }}>
                      {item.icon}
                    </Box>
                  </Stack>
                  <Typography variant="h5">{item.title}</Typography>
                  <Typography color="text.secondary">{item.description}</Typography>
                  {item.enabled ? (
                    <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mt: "auto", pt: 1 }}>
                      <Typography color="primary.main" fontWeight={700}>
                        Open assistant
                      </Typography>
                      <ArrowForwardRoundedIcon sx={{ color: "primary.main", fontSize: 18 }} />
                    </Stack>
                  ) : null}
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {user?.role === "ADMIN" ? (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <Button
            component={Link}
            to="/admin"
            variant="outlined"
            startIcon={<AdminPanelSettingsRoundedIcon />}
            sx={{
              px: 5,
              minHeight: 60,
              borderRadius: 2,
              fontSize: "1rem",
              fontWeight: 700,
              "& .MuiButton-startIcon svg": {
                fontSize: 24
              }
            }}
          >
            Open Admin Panel
          </Button>
        </Box>
      ) : null}
    </Stack>
  );
}
