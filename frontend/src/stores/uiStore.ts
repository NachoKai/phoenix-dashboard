import { create } from "zustand";

interface UiState {
  activeGroup: number;
  sleeping: boolean;
  online: boolean;
  setActiveGroup: (group: number) => void;
  setSleeping: (sleeping: boolean) => void;
  setOnline: (online: boolean) => void;
}

export const useUiStore = create<UiState>(set => ({
  activeGroup: 1,
  sleeping: false,
  online: navigator.onLine,

  setActiveGroup: group => set({ activeGroup: group }),
  setSleeping: sleeping => set({ sleeping }),
  setOnline: online => set({ online }),
}));
