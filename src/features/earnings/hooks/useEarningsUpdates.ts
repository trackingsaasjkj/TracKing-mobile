import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Listens for the 'settlement:created' WS event emitted by the backend
 * when a new liquidación is generated for this courier.
 *
 * Invalidates the earnings cache so React Query re-fetches on the next render,
 * giving the courier instant feedback without manual pull-to-refresh.
 */
export function useEarningsUpdates(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!accessToken) return;

    const unsub = wsClient.on('settlement:created', () => {
      queryClient.invalidateQueries({ queryKey: ['courier-earnings'] });
    });

    return unsub;
  }, [accessToken, queryClient]);
}
