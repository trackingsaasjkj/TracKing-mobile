import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
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
      const trackingResult = await startWorkdayTracking();
      if (!trackingResult.success) {
        console.warn('[useWorkday] Background tracking failed:', trackingResult.reason);
        // Workday started on the server but background tracking is broken.
        // Rollback the workday on the server to keep state consistent,
        // then inform the user so they can fix their location permission.
        try { await workdayApi.end(); } catch { /* best-effort rollback */ }
        setOperationalStatus('UNAVAILABLE');
        const reason = trackingResult.reason ?? 'Permiso de ubicación en segundo plano denegado.';
        Alert.alert(
          'Permiso requerido',
          `Para iniciar la jornada necesitas dar permiso de ubicación "Permitir todo el tiempo".

Ve a: Configuración → Apps → TracKing → Permisos → Ubicación → Permitir todo el tiempo

${reason}`,
          [{ text: 'Entendido', style: 'default' }],
        );
        return { ok: false, error: 'Permiso de ubicación en segundo plano requerido.' };
      }

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
