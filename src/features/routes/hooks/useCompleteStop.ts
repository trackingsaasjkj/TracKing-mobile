import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { routesApi } from '../api/routesApi'
import { useRoutesStore } from '../store/routesStore'
import type { CompleteStopPayload } from '../types/routes.types'

export function useCompleteStop() {
  const [loading, setLoading] = useState<string | null>(null)
  const { updateStop } = useRoutesStore()
  const queryClient = useQueryClient()

  const execute = useCallback(
    async (
      routeId: string,
      stopId: string,
      data: CompleteStopPayload,
    ): Promise<{ ok: boolean; error?: string }> => {
      setLoading(stopId)
      try {
        await routesApi.completeStop(routeId, stopId, data)
        updateStop(stopId, { status: 'COMPLETED', completion_time: new Date().toISOString() })
        await queryClient.invalidateQueries({ queryKey: ['courier-active-route'] })
        await queryClient.invalidateQueries({ queryKey: ['courier-services'] })
        return { ok: true }
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al completar parada' }
      } finally {
        setLoading(null)
      }
    },
    [updateStop, queryClient],
  )

  return { execute, loading }
}
