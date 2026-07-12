import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const PASSWORD_ENV = import.meta.env.VITE_DASHBOARD_PASSWORD ?? "";

interface AuthContextValue {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem("phoenix_auth") === "1";
  });

  const login = useCallback((password: string): boolean => {
    const ok = password === PASSWORD_ENV;
    if (ok) {
      sessionStorage.setItem("phoenix_auth", "1");
      setIsAuthenticated(true);
    }
    return ok;
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem("phoenix_auth");
    setIsAuthenticated(false);
  }, []);

  return <AuthContext value={{ isAuthenticated, login, logout }}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside <AuthProvider>");
  return ctx;
}
