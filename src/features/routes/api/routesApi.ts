import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient'
import type { Route, CompleteStopPayload } from '../types/routes.types'

/** Normalizes Prisma Decimal fields (serialized as strings) to JS numbers */
function normalizeRoute(route: Route): Route {
  return {
    ...route,
    estimated_distance: Number(route.estimated_distance),
    stops: (route.stops ?? []).map((s) => ({
      ...s,
      lat: Number(s.lat),
      lng: Number(s.lng),
    })),
  }
}

export const routesApi = {
  /** GET /api/courier/routes/active — ruta activa del mensajero (PLANNED o IN_PROGRESS) */
  getActiveRoute: (): Promise<Route | null> =>
    apiClient
      .get<ApiResponse<Route | null>>('/api/courier/routes/active')
      .then(unwrap)
      .then((r) => (r ? normalizeRoute(r) : null)),

  /** GET /api/routes/:id — detalle de una ruta por ID (ADMIN, AUX, COURIER) */
  getRoute: (routeId: string): Promise<Route> =>
    apiClient
      .get<ApiResponse<Route>>(`/api/routes/${routeId}`)
      .then(unwrap)
      .then(normalizeRoute),

  /** PATCH /api/routes/:id/stops/:stopId/complete — marca una parada como completada */
  completeStop: (routeId: string, stopId: string, data: CompleteStopPayload): Promise<void> =>
    apiClient
      .patch<ApiResponse<void>>(`/api/routes/${routeId}/stops/${stopId}/complete`, data)
      .then(unwrap),
}
