import React from "react";
import ReactDOM from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/workflow.css";
import "./styles/query-page.css";
import "./styles/report-page.css";
import "./styles/selection-page.css";
import "./styles/auth.css";
import "./styles/logs.css";
import "./styles/lus-decision-tree.css";
import { appTheme } from "./theme";
import { ToastProvider } from "./context/ToastContext";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider theme={appTheme}>
      <CssBaseline />
      <ToastProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
