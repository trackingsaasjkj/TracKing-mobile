import { useCallback, useEffect, useState } from 'react';
import { servicesApi } from '../api/servicesApi';
import { useServicesStore } from '../store/servicesStore';
import type { Service, ServiceStatus } from '../types/services.types';

// Valid transitions — backend is source of truth, but we disable invalid UI actions
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

export function useServices() {
  const { services, setServices, updateService } = useServicesStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await servicesApi.getAll();
      setServices(data);
    } catch (err: any) {
      setError(err?.userMessage ?? 'Error al cargar servicios');
    } finally {
      setLoading(false);
    }
  }, [setServices]);

  useEffect(() => { load(); }, [load]);

  const performAction = useCallback(
    async (service: Service): Promise<{ ok: boolean; error?: string }> => {
      const next = nextStatus(service.status);
      if (!next) return { ok: false, error: 'Acción no disponible' };

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
    [updateService]
  );

  return { services, loading, error, actionLoading, refresh: load, performAction };
}
