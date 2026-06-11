import { useCallback } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { routesApi } from '../api/routesApi'
import { useRoutesStore } from '../store/routesStore'
import { useAutoRefresh } from '@/core/hooks/useAutoRefresh'
import { useRouteUpdates } from './useRouteUpdates'

/**
 * Fetches a route by its ID. The routeId comes from the active service's
 * routeStop.route_id field (ServiceDetailScreen passes it via navigation).
 */
export function useActiveRoute(routeId?: string) {
  const { setActiveRoute, clearActiveRoute } = useRoutesStore()
  const queryClient = useQueryClient()

  // Subscribe to real-time WS events for this route
  useRouteUpdates(routeId)

  const query = useQuery({
    queryKey: ['courier-active-route', routeId],
    queryFn: async () => {
      if (!routeId) return null
      const data = await routesApi.getRoute(routeId)
      setActiveRoute(data)
      return data
    },
    enabled: !!routeId,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['courier-active-route', routeId] })
  }, [queryClient, routeId])

  useAutoRefresh(refresh, { foregroundInterval: 15_000 })

  return {
    route: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError
      ? (query.error as any)?.userMessage ?? 'Error al cargar ruta'
      : null,
    refresh,
  }
}
