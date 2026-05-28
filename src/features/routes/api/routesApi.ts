import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient'
import type { Route, CompleteStopPayload } from '../types/routes.types'

export const routesApi = {
  getActiveRoute: (): Promise<Route | null> =>
    apiClient
      .get<ApiResponse<Route | null>>('/api/courier/routes/active')
      .then(unwrap),

  completeStop: (routeId: string, stopId: string, data: CompleteStopPayload): Promise<void> =>
    apiClient
      .patch<ApiResponse<void>>(`/api/rutas/${routeId}/stops/${stopId}/complete`, data)
      .then(unwrap),
}
