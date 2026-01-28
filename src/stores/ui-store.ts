import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  insightPanelOpen: boolean;
  toggleSidebar: () => void;
  toggleInsightPanel: () => void;
  setSidebarOpen: (open: boolean) => void;
  setInsightPanelOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  insightPanelOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleInsightPanel: () => set((state) => ({ insightPanelOpen: !state.insightPanelOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setInsightPanelOpen: (open) => set({ insightPanelOpen: open }),
}));
