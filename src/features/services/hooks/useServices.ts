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
 * BUG-04/11 FIX: reads from store only — no fetch, no duplicate requests.
 */
export function useServiceDetail() {
  const { updateService } = useServicesStore();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const performAction = useCallback(
    async (service: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(service.status);
      if (!next) return { ok: false, error: 'Accion no disponible' };

      setActionLoading(service.id);
      try {
        const updated = await servicesApi.updateStatus(service.id, next);
        updateService(updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
      } finally {
        setActionLoading(null);
      }
    },
    [updateService],
  );

  const performPaymentAction = useCallback(
    async (
      serviceId: string,
      payment_status: import('../types/services.types').PaymentStatus,
    ): Promise<{ ok: boolean; error?: string }> => {
      setPaymentLoading(true);
      try {
        const updated = await servicesApi.updatePayment(serviceId, payment_status);
        updateService(updated);
        return { ok: true };
      } catch (err: any) {
        return { ok: false, error: err?.userMessage ?? 'Error al actualizar pago' };
      } finally {
        setPaymentLoading(false);
      }
    },
    [updateService],
  );

  return { actionLoading, performAction, paymentLoading, performPaymentAction };
}
