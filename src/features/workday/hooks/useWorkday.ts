import { useState, useCallback } from 'react';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useWorkdayTracking } from '@/features/tracking/hooks/useWorkdayTracking';
import { workdayApi } from '../api/workdayApi';

interface WorkdayResult {
  ok: boolean;
  error?: string;
}

interface UseWorkdayReturn {
  loading: boolean;
  startWorkday: () => Promise<WorkdayResult>;
  endWorkday: () => Promise<WorkdayResult>;
}

/** Returns true if any service is still in an active state */
function hasActiveServices(): boolean {
  const { services } = useServicesStore.getState();
  return services.some(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT'
  );
}

export function useWorkday(): UseWorkdayReturn {
  const [loading, setLoading] = useState(false);
  const setOperationalStatus = useAuthStore((s) => s.setOperationalStatus);
  const { startWorkdayTracking, stopWorkdayTracking } = useWorkdayTracking();

  const startWorkday = useCallback(async (): Promise<WorkdayResult> => {
    setLoading(true);
    try {
      await workdayApi.start();
      setOperationalStatus('AVAILABLE');
      // Start background location for the entire workday — runs even when app is closed
      await startWorkdayTracking();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.userMessage ?? 'No se pudo iniciar la jornada' };
    } finally {
      setLoading(false);
    }
  }, [setOperationalStatus, startWorkdayTracking]);

  const endWorkday = useCallback(async (): Promise<WorkdayResult> => {
    // Client-side guard — backend also enforces this
    if (hasActiveServices()) {
      return { ok: false, error: 'Tienes servicios activos. Finalízalos antes de cerrar la jornada.' };
    }

    setLoading(true);
    try {
      await workdayApi.end();
      setOperationalStatus('UNAVAILABLE');
      // Stop background location — workday is over
      await stopWorkdayTracking();
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err?.userMessage ?? 'No se pudo finalizar la jornada' };
    } finally {
      setLoading(false);
    }
  }, [setOperationalStatus, stopWorkdayTracking]);

  return { loading, startWorkday, endWorkday };
}
