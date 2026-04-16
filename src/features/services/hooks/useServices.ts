import { useCallback, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { servicesApi } from '../api/servicesApi';
import { useServicesStore } from '../store/servicesStore';
import type { Service, ServiceStatus } from '../types/services.types';

const NEXT_STATUS: Partial<Record<ServiceStatus, ServiceStatus>> = {
  ASSIGNED: 'ACCEPTED',
  ACCEPTED: 'IN_TRANSIT',
  IN_TRANSIT: 'DELIVERED',
};

export function canTransition(current: ServiceStatus): boolean {
  return current in NEXT_STATUS;
}

export function nextStatus(current: ServiceStatus): ServiceStatus | null {
  return NEXT_STATUS[current] ?? null;
}

/**
 * Full hook: fetches services from backend via React Query and exposes performAction.
 * Use ONLY in ServicesScreen (list). ServiceDetailScreen uses useServiceDetail.
 * Requirements: 5.4, 5.5
 */
export function useServices() {
  const { setServices, updateService } = useServicesStore();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['courier-services'],
    queryFn: async () => {
      const data = await servicesApi.getAll();
      setServices(data);
      return data;
    },
    placeholderData: keepPreviousData,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['courier-services'] });
  }, [queryClient]);

  const performAction = useCallback(
    async (service: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(service.status);
      if (!next) return { ok: false, error: 'Accion no disponible' };

      setActionLoading(service.id);
      try {
        const updated = await servicesApi.updateStatus(service.id, next);
        updateService(updated);
        await queryClient.invalidateQueries({ queryKey: ['courier-services'] });
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
      } finally {
        setActionLoading(null);
      }
    },
    [updateService, queryClient],
  );

  return {
    services: query.data ?? [],
    loading: query.isLoading,
    refreshing: query.isFetching && !query.isLoading,
    error: query.isError ? (query.error as any)?.userMessage ?? 'Error al cargar servicios' : null,
    actionLoading,
    refresh,
    performAction,
  };
}

/**
 * Lightweight hook for ServiceDetailScreen.
 * BUG-04/11 FIX: reads from store first — no duplicate requests for active services.
 * HISTORY FIX: when service is not in store (came from history), fetches from backend.
 */
export function useServiceDetail(serviceId: string) {
  const { updateService } = useServicesStore();
  const queryClient = useQueryClient();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  // Try store first (active services loaded by useServices)
  const serviceFromStore = useServicesStore((s) => s.services.find((x) => x.id === serviceId));

  // Fallback: fetch from backend when not in store (e.g. navigating from history)
  const query = useQuery({
    queryKey: ['courier-service-detail', serviceId],
    queryFn: () => servicesApi.getById(serviceId),
    enabled: !serviceFromStore,   // only fetch if not already in store
    staleTime: 30_000,
  });

  const service = serviceFromStore ?? query.data ?? null;

  const performAction = useCallback(
    async (svc: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(svc.status);
      if (!next) return { ok: false, error: 'Accion no disponible' };

      setActionLoading(svc.id);
      try {
        const updated = await servicesApi.updateStatus(svc.id, next);
        updateService(updated);
        // Also update the detail cache so the screen reflects the new state
        queryClient.setQueryData(['courier-service-detail', svc.id], updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
      } finally {
        setActionLoading(null);
      }
    },
    [updateService, queryClient],
  );

  const performPaymentAction = useCallback(
    async (
      svcId: string,
      payment_status: import('../types/services.types').PaymentStatus,
    ): Promise<{ ok: boolean; error?: string }> => {
      setPaymentLoading(true);
      try {
        const updated = await servicesApi.updatePayment(svcId, payment_status);
        updateService(updated);
        queryClient.setQueryData(['courier-service-detail', svcId], updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar pago' };
      } finally {
        setPaymentLoading(false);
      }
    },
    [updateService, queryClient],
  );

  return {
    service,
    isLoading: query.isLoading && !serviceFromStore,
    isError: query.isError && !serviceFromStore,
    actionLoading,
    performAction,
    paymentLoading,
    performPaymentAction,
  };
}
