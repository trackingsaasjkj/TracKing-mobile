import { useEffect } from 'react'
import { useAuthStore } from '@/features/auth/store/authStore'
import { useRoutesStore } from '../store/routesStore'
import { routesApi } from '../api/routesApi'

/**
 * Fetches the courier's active route once on mount (after session restore).
 *
 * Called from useServices() so it runs as soon as the authenticated session
 * is ready — the same moment services are fetched. This guarantees that if
 * a route was assigned before the app was opened, it appears immediately
 * without waiting for a WS event that already fired.
 *
 * Runs whenever authentication state changes. Guards against re-running
 * when there's already a non-terminal active route in the store.
 */
export function useLoadActiveRoute(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { activeRoute, setActiveRoute } = useRoutesStore()

  useEffect(() => {
    if (!isAuthenticated) return

    // Skip fetch only if there's already a live (non-terminal) route in the store.
    // If the store has a COMPLETED/CANCELLED route, we still need to fetch in case
    // a new route was assigned — the old guard (loaded flag) was preventing this.
    const hasLiveRoute =
      activeRoute &&
      activeRoute.status !== 'COMPLETED' &&
      activeRoute.status !== 'CANCELLED'

    if (hasLiveRoute) return

    routesApi
      .getActiveRoute()
      .then((route) => {
        if (route) {
          setActiveRoute(route)
        } else {
          // No active route — clear any stale terminal route from the store
          useRoutesStore.setState({ activeRoute: null, loaded: true })
        }
      })
      .catch(() => {
        useRoutesStore.setState({ loaded: true })
      })
  }, [isAuthenticated, activeRoute?.status]) // re-run when status changes
}
