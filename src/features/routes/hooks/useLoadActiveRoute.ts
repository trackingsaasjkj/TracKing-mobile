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
 * Only runs once per session (enabled only when authenticated and route not
 * yet loaded). WS events handle subsequent updates.
 */
export function useLoadActiveRoute(): void {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { activeRoute, loaded, setActiveRoute } = useRoutesStore()

  useEffect(() => {
    // Skip if not authenticated, already loaded, or route already in store
    if (!isAuthenticated || loaded || activeRoute) return

    routesApi
      .getActiveRoute()
      .then((route) => {
        if (route) setActiveRoute(route)
        else {
          // No active route — mark as loaded so we don't retry on every render
          useRoutesStore.setState({ loaded: true })
        }
      })
      .catch(() => {
        // Non-critical — silently fail, WS will catch future assignments
        useRoutesStore.setState({ loaded: true })
      })
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps
}
