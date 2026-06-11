import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { wsClient } from '@/core/api/wsClient';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '../store/servicesStore';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { onServiceUpdateMessage } from '@/core/notifications/fcm.service';
import type { Service } from '../types/services.types';
import type { Route, RouteStop } from '@/features/routes/types/routes.types';

/**
 * Connects the WebSocket client and FCM handler to the services store.
 *
 * - WebSocket: real-time updates while app in foreground (< 50ms latency)
 * - FCM: silent push updates when app in background/killed state
 *
 * Also subscribes to route:* events here so they are always active,
 * regardless of whether RouteDetailScreen is mounted.
 *
 * Mount this hook once inside useServices() so there is a single connection
 * per app session.
 */
export function useServiceUpdates(): void {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { updateService, addService } = useServicesStore();
  const { setActiveRoute, updateStop, clearActiveRoute } = useRoutesStore();
  const queryClient = useQueryClient();

  // ── WebSocket ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!accessToken) return;

    wsClient.connect(accessToken);

    // ── Service events ───────────────────────────────────────────────────────
    const unsubUpdate = wsClient.on('service:updated', (raw: unknown) => {
      const service = raw as Service;
      updateService(service);
      queryClient.setQueryData(['courier-service-detail', service.id], service);
    });

    const unsubAssigned = wsClient.on('service:assigned', (raw: unknown) => {
      const service = raw as Service;
      addService(service);
      queryClient.invalidateQueries({ queryKey: ['courier-services'] });
    });

    // ── Route events — always active so route:assigned is never missed ───────

    // Fires when admin assigns a route to this courier
    const unsubRouteAssigned = wsClient.on('route:assigned', (raw: unknown) => {
      const route = raw as Route
      // Prisma serializes Decimal fields as strings — normalize lat/lng/distances to numbers
      const normalized: Route = {
        ...route,
        estimated_distance: Number(route.estimated_distance),
        stops: (route.stops ?? []).map((s) => ({
          ...s,
          lat: Number(s.lat),
          lng: Number(s.lng),
        })),
      }
      setActiveRoute(normalized)
      queryClient.setQueryData(['courier-active-route', normalized.id], normalized)

      // Patch existing services in the store so they show routeStop immediately,
      // without waiting for the HTTP refetch to complete.
      // Each stop may link to a service via stop.service_id.
      const routeRef = { id: normalized.id, total_stops: normalized.total_stops }
      const { services } = useServicesStore.getState()
      normalized.stops.forEach((stop) => {
        if (!stop.service_id) return
        const existing = services.find((s) => s.id === stop.service_id)
        if (existing && !existing.routeStop) {
          updateService({ ...existing, routeStop: { id: stop.id, route: routeRef } })
        }
      })

      // Still invalidate so the full list is refreshed from the server
      queryClient.invalidateQueries({ queryKey: ['courier-services'] })
    })

    // Fires when route status changes (COMPLETED / CANCELLED)
    const unsubRouteUpdated = wsClient.on('route:updated', (raw: unknown) => {
      const partial = raw as { id: string; status: Route['status'] };
      const { activeRoute } = useRoutesStore.getState();
      if (activeRoute && activeRoute.id === partial.id) {
        setActiveRoute({ ...activeRoute, status: partial.status });
        queryClient.setQueryData(['courier-active-route', partial.id], {
          ...activeRoute,
          status: partial.status,
        });
      }
      if (partial.status === 'CANCELLED' || partial.status === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: ['courier-services'] });
        queryClient.invalidateQueries({ queryKey: ['courier-earnings'] });
        if (partial.status === 'CANCELLED') clearActiveRoute();
      }
    });

    // Fires when a stop is marked done
    const unsubStopCompleted = wsClient.on('route:stop:completed', (raw: unknown) => {
      const payload = raw as { route_id: string; stop_id: string; route_status: Route['status'] };
      updateStop(payload.stop_id, {
        status: 'COMPLETED' as RouteStop['status'],
        completion_time: new Date().toISOString(),
      });
      if (payload.route_status === 'COMPLETED') {
        queryClient.invalidateQueries({ queryKey: ['courier-active-route', payload.route_id] });
        queryClient.invalidateQueries({ queryKey: ['courier-services'] });
      }
    });

    return () => {
      unsubUpdate();
      unsubAssigned();
      unsubRouteAssigned();
      unsubRouteUpdated();
      unsubStopCompleted();
      wsClient.disconnect();
    };
  }, [accessToken, updateService, addService, setActiveRoute, updateStop, clearActiveRoute, queryClient]);

  // ── FCM foreground handler ─────────────────────────────────────────────────
  useEffect(() => {
    const unsubFcm = onServiceUpdateMessage((service: Service) => {
      updateService(service);
      queryClient.setQueryData(['courier-service-detail', service.id], service);
    });

    return unsubFcm;
  }, [updateService, queryClient]);
}
