import { Route, Routes } from "react-router-dom";
import { useWakeLock } from "./hooks/useWakeLock";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";

export default function App() {
  useWakeLock();

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
