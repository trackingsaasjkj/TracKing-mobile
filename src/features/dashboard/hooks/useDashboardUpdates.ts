import { useEffect } from 'react';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Listens to WS events that require the dashboard to refresh.
 *
 * - service:updated  → KPIs recalculate automatically from servicesStore (no re-fetch needed)
 * - service:assigned → new service added to the courier's list, triggers a full refresh
 *                      so the KPI counts and activeServices list stay accurate
 */
export function useDashboardUpdates(onRefresh: () => void): void {
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    // service:updated is already handled by useServiceUpdates (servicesStore stays in sync)
    // We only need to trigger a refresh when a brand-new service is assigned
    const unsub = wsClient.on('service:assigned', () => {
      onRefresh();
    });

    return unsub;
  }, [accessToken, onRefresh]);
}
