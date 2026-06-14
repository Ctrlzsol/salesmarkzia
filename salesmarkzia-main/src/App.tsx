import { Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AdminPage } from "./pages/AdminPage";
import { ClientDashboard } from "./pages/ClientDashboard";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/:clientSlug" element={<ClientDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
