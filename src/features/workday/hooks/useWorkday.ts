import { useState, useCallback } from 'react';
import { Alert, Linking } from 'react-native';
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

      // Start background location for the entire workday so the courier keeps
      // reporting even when the screen is off, the phone is locked or the app
      // is in the background.
      // Interactive: this is the only place where the app may show OS
      // permission prompts. Background permission is best-effort and never
      // rolls back the workday (the Android foreground service only needs
      // "while in use" permission).
      const trackingResult = await startWorkdayTracking({ interactive: true });
      if (!trackingResult.success) {
        console.warn('[useWorkday] Background tracking failed:', trackingResult.reason);

        // Workday started on the server but tracking cannot start at all
        // (location services off or foreground permission denied). Roll back
        // to keep the client/server state consistent.
        try {
          await workdayApi.end();
        } catch {
          // best-effort rollback
        }
        setOperationalStatus('UNAVAILABLE');

        const reason = trackingResult.reason ?? 'No se pudo iniciar el rastreo de ubicación.';
        Alert.alert(
          'Ubicación requerida',
          `Para iniciar la jornada necesitas activar la ubicación y permitir el acceso "Mientras usas la app".

${reason}

Si el problema continúa, revisa: Configuración → Apps → TracKing app → Permisos → Ubicación.
También desactiva la optimización de batería para TracKing en Configuración → Batería.`,
          [
            { text: 'Entendido', style: 'default' },
            { text: 'Abrir ajustes', onPress: () => { void Linking.openSettings(); } },
          ],
        );

        return { ok: false, error: trackingResult.reason ?? 'Ubicación requerida para iniciar la jornada.' };
      }

      if (trackingResult.warning) {
        console.warn('[useWorkday] Tracking warning:', trackingResult.warning);
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
