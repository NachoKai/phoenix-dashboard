import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { useWakeLock } from "./hooks/useWakeLock";
import { useAuthStore } from "./stores/authStore";
import { Dashboard } from "./pages/Dashboard";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { darkTheme, lightTheme, ThemeModeContext, GlobalStyle } from "./styles/theme";

export default function App() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const [themeMode, setThemeMode] = useState<"dark" | "light">("dark");
  useWakeLock();

  return (
    <ThemeModeContext.Provider value={{ themeMode, setThemeMode }}>
      <ThemeProvider theme={themeMode === "dark" ? darkTheme : lightTheme}>
        <GlobalStyle />
        {!isAuthenticated ? (
          <Login onSuccess={() => window.location.reload()} />
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        )}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
