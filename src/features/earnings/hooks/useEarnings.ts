import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { earningsApi } from '../api/earningsApi';
import { useEarningsUpdates } from './useEarningsUpdates';

/**
 * Fetches earnings summary from GET /api/courier/settlements/earnings.
 * The response includes total_earned, total_services, total_settlements
 * and the full settlements array — a single request covers everything.
 *
 * Previously used /api/liquidations/* (ADMIN-only endpoints) — BUG-09 fix.
 */
export function useEarnings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['courier-earnings'],
    queryFn: () => earningsApi.getSummary(),
    staleTime: 60_000,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['courier-earnings'] });
  }, [queryClient]);

  // Invalidate cache when backend emits settlement:created via WebSocket
  useEarningsUpdates();

  return {
    summary: query.data ?? null,
    liquidations: query.data?.settlements ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: query.isError
      ? (query.error as any)?.userMessage ?? 'Error al cargar ganancias'
      : null,
    refresh,
  };
}
