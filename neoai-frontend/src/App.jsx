import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { AiModuleSelectionPage } from "./pages/AiModuleSelectionPage";
import { AiModuleSelectionPulseOximeterPage } from "./pages/AiModuleSelectionPulseOximeterPage";
import { AiModuleSelectionEcgPulseOximeterPage } from "./pages/AiModuleSelectionEcgPulseOximeterPage";
import { AiResultsPage } from "./pages/AiResultsPage";
import { AiResultsPulseOximeterPage } from "./pages/AiResultsPulseOximeterPage";
import { AiResultsEcgPulseOximeterPage } from "./pages/AiResultsEcgPulseOximeterPage";
import { DataPreprocessingPage } from "./pages/DataPreprocessingPage";
import { DataPreprocessingPulseOximeterPage } from "./pages/DataPreprocessingPulseOximeterPage";
import { DataPreprocessingEcgPulseOximeterPage } from "./pages/DataPreprocessingEcgPulseOximeterPage";
import { DataSelectionPage } from "./pages/DataSelectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientQueryWorkflowPage } from "./pages/PatientQueryWorkflowPage";
import { PatientQueryPulseOximeterPage } from "./pages/PatientQueryPulseOximeterPage";
import { PatientQueryEcgPulseOximeterPage } from "./pages/PatientQueryEcgPulseOximeterPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportingPage } from "./pages/ReportingPage";
import { LogsPage } from "./pages/LogsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="query" element={<PatientQueryWorkflowPage />} />
          <Route path="query-pulse-oximeter" element={<PatientQueryPulseOximeterPage />} />
          <Route path="query-ecg-pulse-oximeter" element={<PatientQueryEcgPulseOximeterPage />} />
          <Route path="selection/:patientId/:examinationId" element={<DataSelectionPage />} />
          <Route path="preprocessing/:patientId/:examinationId" element={<DataPreprocessingPage />} />
          <Route path="preprocessing-pulse-oximeter/:patientId/:examinationId" element={<DataPreprocessingPulseOximeterPage />} />
          <Route path="preprocessing-ecg-pulse-oximeter/:patientId/:examinationId" element={<DataPreprocessingEcgPulseOximeterPage />} />
          <Route path="ai-module/:patientId/:examinationId" element={<AiModuleSelectionPage />} />
          <Route path="ai-module-pulse-oximeter/:patientId/:examinationId" element={<AiModuleSelectionPulseOximeterPage />} />
          <Route path="ai-module-ecg-pulse-oximeter/:patientId/:examinationId" element={<AiModuleSelectionEcgPulseOximeterPage />} />
          <Route path="results/:reportId" element={<AiResultsPage />} />
          <Route path="results-pulse-oximeter/:reportId" element={<AiResultsPulseOximeterPage />} />
          <Route path="results-ecg-pulse-oximeter/:reportId" element={<AiResultsEcgPulseOximeterPage />} />
          <Route path="report/:reportId" element={<ReportingPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
