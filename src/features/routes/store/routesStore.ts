import { create } from 'zustand'
import type { Route, RouteStop } from '../types/routes.types'

interface RoutesState {
  activeRoute: Route | null
  loaded: boolean
  setActiveRoute: (route: Route | null) => void
  updateStop: (stopId: string, updates: Partial<RouteStop>) => void
  clearActiveRoute: () => void
}

export const useRoutesStore = create<RoutesState>((set) => ({
  activeRoute: null,
  loaded: false,
  setActiveRoute: (route) => set({ activeRoute: route, loaded: true }),
  updateStop: (stopId, updates) =>
    set((state) => {
      if (!state.activeRoute) return state
      return {
        activeRoute: {
          ...state.activeRoute,
          stops: state.activeRoute.stops.map((s) =>
            s.id === stopId ? { ...s, ...updates } : s,
          ),
        },
      }
    }),
  clearActiveRoute: () => set({ activeRoute: null, loaded: false }),
}))
