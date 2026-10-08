import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { LangProvider } from "@/lib/i18n";
import SubmitPage from "@/pages/SubmitPage";
import ResultsPage from "@/pages/ResultsPage";
import LoginPage from "@/pages/LoginPage";
import AuthCallback from "@/pages/AuthCallback";
import Dashboard from "@/pages/Dashboard";
import ProtectedRoute from "@/components/ProtectedRoute";

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/submit" replace />} />
      <Route path="/submit" element={<SubmitPage />} />
      <Route path="/results" element={<ResultsPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute>{(user) => <Dashboard user={user} />}</ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/submit" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </LangProvider>
  );
}
