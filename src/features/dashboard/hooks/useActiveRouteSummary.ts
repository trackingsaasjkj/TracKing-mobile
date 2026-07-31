import { useMemo } from 'react'
import { useServicesStore } from '@/features/services/store/servicesStore'
import { useRoutesStore } from '@/features/routes/store/routesStore'

/**
 * Derives the active route summary from services already in the store.
 *
 * A route is considered "active" when the courier has at least one service
 * in ASSIGNED / ACCEPTED / IN_TRANSIT state that belongs to a route (routeStop present).
 *
 * Returns the routeId + stop progress so HomeScreen can show a banner
 * without any additional network request.
 */
export function useActiveRouteSummary() {
  const services = useServicesStore((s) => s.services)
  const activeRouteInStore = useRoutesStore((s) => s.activeRoute)

  return useMemo(() => {
    // First try the routes store (populated after the user opens RouteDetailScreen).
    // Skip terminal statuses — a COMPLETED or CANCELLED route should never appear
    // in the dashboard banner, even if the store hasn't been cleared yet.
    if (activeRouteInStore && activeRouteInStore.status !== 'COMPLETED' && activeRouteInStore.status !== 'CANCELLED') {
      const stops = activeRouteInStore.stops ?? []
      const completed = stops.filter((s) => s.status === 'COMPLETED').length
      return {
        routeId: activeRouteInStore.id,
        totalStops: activeRouteInStore.total_stops,
        completedStops: completed,
        routeStatus: activeRouteInStore.status,
      }
    }

    // Otherwise derive from services — works even before the user opens the route
    const routeService = services.find(
      (s) =>
        s.routeStop != null &&
        (s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT'),
    )

    if (!routeService?.routeStop) return null

    return {
      routeId: routeService.routeStop.route.id,
      totalStops: routeService.routeStop.route.total_stops,
      completedStops: 0, // unknown until the route is fetched
      routeStatus: 'IN_PROGRESS' as const,
    }
  }, [services, activeRouteInStore])
}
