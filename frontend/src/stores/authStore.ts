import { create } from "zustand";

const PASSWORD_ENV = import.meta.env.VITE_DASHBOARD_PASSWORD ?? "";

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: sessionStorage.getItem("phoenix_auth") === "1",

  login: (password: string) => {
    const ok = password === PASSWORD_ENV;
    if (ok) {
      sessionStorage.setItem("phoenix_auth", "1");
      set({ isAuthenticated: true });
    }
    return ok;
  },

  logout: () => {
    sessionStorage.removeItem("phoenix_auth");
    set({ isAuthenticated: false });
  },
}));
