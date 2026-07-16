import { Route, Routes } from "react-router-dom";
import { useWakeLock } from "./hooks/useWakeLock";
import { useAuthStore } from "./stores/authStore";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  useWakeLock();

  if (!isAuthenticated) {
    return <Login onSuccess={() => window.location.reload()} />;
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
