import { useCallback } from 'react'
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { routesApi } from '../api/routesApi'
import { useRoutesStore } from '../store/routesStore'
import { useAutoRefresh } from '@/core/hooks/useAutoRefresh'

export function useActiveRoute() {
  const { setActiveRoute, clearActiveRoute } = useRoutesStore()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['courier-active-route'],
    queryFn: async () => {
      const data = await routesApi.getActiveRoute()
      if (data) {
        setActiveRoute(data)
      } else {
        clearActiveRoute()
      }
      return data
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  })

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['courier-active-route'] })
  }, [queryClient])

  useAutoRefresh(refresh, { foregroundInterval: 15_000 })

  return {
    route: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.isError
      ? (query.error as any)?.userMessage ?? 'Error al cargar ruta activa'
      : null,
    refresh,
  }
}
