import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '../store/servicesStore';
import { onServiceUpdateMessage } from '@/core/notifications/fcm.service';
import type { Service } from '../types/services.types';

/**
 * Connects the WebSocket client and FCM handler to the services store.
 *
 * - WebSocket: real-time updates while app is in foreground (< 50ms latency)
 * - FCM: silent push updates when app is in background/killed state
 *
 * Mount this hook once inside useServices() so there is a single connection
 * per app session.
 */
export function useServiceUpdates(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { updateService, addService } = useServicesStore();
  const queryClient = useQueryClient();

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    wsClient.connect(accessToken);

    const unsubUpdate = wsClient.on('service:updated', (raw: unknown) => {
      const service = raw as Service;
      updateService(service);
      // Keep detail cache in sync so ServiceDetailScreen reflects the change
      queryClient.setQueryData(['courier-service-detail', service.id], service);
    });

    const unsubAssigned = wsClient.on('service:assigned', (raw: unknown) => {
      const service = raw as Service;
      addService(service);
      // Invalidate list query so React Query re-fetches on next render
      queryClient.invalidateQueries({ queryKey: ['courier-services'] });
    });

    return () => {
      unsubUpdate();
      unsubAssigned();
      wsClient.disconnect();
    };
  }, [accessToken, updateService, addService, queryClient]);

  // ── FCM foreground handler ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubFcm = onServiceUpdateMessage((service: Service) => {
      updateService(service);
      queryClient.setQueryData(['courier-service-detail', service.id], service);
    });

    return unsubFcm;
  }, [updateService, queryClient]);
}
