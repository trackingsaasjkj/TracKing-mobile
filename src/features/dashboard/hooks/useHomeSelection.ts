import { useCallback, useEffect, useMemo, useState } from 'react';
import { routesApi } from '@/features/routes/api/routesApi';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import type { Service } from '@/features/services/types/services.types';
import {
  routeStopsToMapPoints,
  serviceToMapPoints,
  type MapPoint,
} from '../utils/mapSelection';

const ROUTE_PREFIX = 'route:';
const SERVICE_PREFIX = 'service:';

interface ActiveRouteSummary {
  routeId: string;
  totalStops: number;
}

interface UseHomeSelectionParams {
  /** All services the courier must act on today (including route members) */
  activeServices: Service[];
  /** Summary of the currently active route, if any */
  activeRoute: ActiveRouteSummary | null;
}

/**
 * Owns the "selected service/route" state for the Home map.
 *
 * Responsibilities:
 *   - Track which row is selected in the bottom sheet.
 *   - Resolve that selection into map points (pickup/delivery or route stops).
 *   - Lazily fetch route stops when they are not in the store yet.
 *   - Clear the selection automatically when the service/route disappears.
 */
export function useHomeSelection({
  activeServices,
  activeRoute,
}: UseHomeSelectionParams) {
  const routeInStore = useRoutesStore((s) => s.activeRoute);
  const setActiveRoute = useRoutesStore((s) => s.setActiveRoute);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [recenterToken, setRecenterToken] = useState(0);

  const selectedRouteId = selectedId?.startsWith(ROUTE_PREFIX)
    ? selectedId.slice(ROUTE_PREFIX.length)
    : null;
  const selectedServiceId = selectedId?.startsWith(SERVICE_PREFIX)
    ? selectedId.slice(SERVICE_PREFIX.length)
    : null;

  const selectedService = useMemo(
    () =>
      selectedServiceId
        ? activeServices.find((s) => s.id === selectedServiceId) ?? null
        : null,
    [activeServices, selectedServiceId],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setRecenterToken((n) => n + 1);
  }, []);

  const recenter = useCallback(() => {
    setRecenterToken((n) => n + 1);
  }, []);

  const selectService = useCallback((serviceId: string) => {
    setSelectedId((current) =>
      current === `${SERVICE_PREFIX}${serviceId}`
        ? null
        : `${SERVICE_PREFIX}${serviceId}`,
    );
  }, []);

  const selectRoute = useCallback(
    async (routeId: string) => {
      setSelectedId((current) =>
        current === `${ROUTE_PREFIX}${routeId}` ? null : `${ROUTE_PREFIX}${routeId}`,
      );

      const current = useRoutesStore.getState().activeRoute;
      if (current?.id === routeId && (current.stops?.length ?? 0) > 0) return;

      setRouteLoading(true);
      try {
        const route = await routesApi.getRoute(routeId);
        setActiveRoute(route);
      } catch {
        // Fall back to the associated service coordinates (see mapPoints below)
      } finally {
        setRouteLoading(false);
      }
    },
    [setActiveRoute],
  );

  // Drop the selection if the underlying service/route is gone.
  useEffect(() => {
    if (!selectedId) return;

    if (selectedRouteId) {
      if (!activeRoute || activeRoute.routeId !== selectedRouteId) {
        setSelectedId(null);
      }
      return;
    }

    if (selectedServiceId) {
      const stillActive = activeServices.some((s) => s.id === selectedServiceId);
      if (!stillActive) setSelectedId(null);
    }
  }, [activeRoute, activeServices, selectedId, selectedRouteId, selectedServiceId]);

  const mapPoints = useMemo<MapPoint[]>(() => {
    if (selectedRouteId) {
      const stops =
        routeInStore?.id === selectedRouteId ? routeInStore.stops ?? [] : [];
      if (stops.length > 0) return routeStopsToMapPoints(stops);

      // Route stops not loaded yet — show the first associated service instead
      const associated = activeServices.find(
        (s) => s.routeStop?.route.id === selectedRouteId,
      );
      return associated ? serviceToMapPoints(associated) : [];
    }

    if (selectedService) return serviceToMapPoints(selectedService);
    return [];
  }, [activeServices, routeInStore, selectedRouteId, selectedService]);

  return {
    selectedId,
    selectedService,
    selectedRouteId,
    routeLoading,
    mapPoints,
    recenterToken,
    selectService,
    selectRoute,
    clearSelection,
    recenter,
  };
}
