import { create } from "zustand";

const PASSWORD_ENV = import.meta.env.VITE_DASHBOARD_PASSWORD ?? "";

interface AuthState {
  isAuthenticated: boolean;
  login: (password: string) => boolean;
  logout: () => void;
}

export const useAuthStore = create<AuthState>(set => ({
  isAuthenticated: localStorage.getItem("phoenix_auth") === "1",

  login: (password: string) => {
    const ok = password === PASSWORD_ENV;
    if (ok) {
      localStorage.setItem("phoenix_auth", "1");
      set({ isAuthenticated: true });
    }
    return ok;
  },

  logout: () => {
    localStorage.removeItem("phoenix_auth");
    set({ isAuthenticated: false });
  },
}));
