import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIState>()(
  devtools((set) => ({
    sidebarOpen: true,
    theme: 'light',
    toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen }), false, 'toggleSidebar'),
    setTheme: (theme) => set({ theme }, false, 'setTheme'),
  }))
)
