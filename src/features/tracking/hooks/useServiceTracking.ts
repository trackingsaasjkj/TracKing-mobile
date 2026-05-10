import { useEffect, useRef } from 'react';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useWorkdayTracking } from './useWorkdayTracking';
import { useAuthStore } from '@/features/auth/store/authStore';

/**
 * Monitors service status changes and manages background location tracking.
 *
 * Lifecycle:
 *   - When ANY service transitions to IN_TRANSIT → start background tracking
 *   - When ALL services are completed/cancelled → stop background tracking
 *
 * This ensures location is only tracked while the courier is actively
 * delivering a service, not during idle time between services.
 *
 * Mount this hook in a top-level component (e.g., RootNavigator or AppProviders)
 * so it runs throughout the entire app session.
 */
export function useServiceTracking(): void {
  const services = useServicesStore((s) => s.services);
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
  const { startWorkdayTracking, stopWorkdayTracking } = useWorkdayTracking();
  
  const trackingActiveRef = useRef(false);

  useEffect(() => {
    // Only track if courier is in an active workday (AVAILABLE or IN_SERVICE)
    if (operationalStatus !== 'AVAILABLE' && operationalStatus !== 'IN_SERVICE') {
      // Workday ended — stop tracking if it was running
      if (trackingActiveRef.current) {
        console.log('[ServiceTracking] Workday ended, stopping tracking');
        stopWorkdayTracking().catch((err) => {
          console.error('[ServiceTracking] Error stopping tracking:', err);
        });
        trackingActiveRef.current = false;
      }
      return;
    }

    // Check if there are any active services (ASSIGNED, ACCEPTED, or IN_TRANSIT)
    const hasActiveServices = services.some(
      (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT',
    );

    // If there are active services and tracking is not running → start it
    if (hasActiveServices && !trackingActiveRef.current) {
      console.log('[ServiceTracking] Active services detected, starting tracking');
      startWorkdayTracking()
        .then((result) => {
          if (result.success) {
            trackingActiveRef.current = true;
            console.log('[ServiceTracking] Tracking started successfully');
          } else {
            console.warn('[ServiceTracking] Failed to start tracking:', result.reason);
          }
        })
        .catch((err) => {
          console.error('[ServiceTracking] Error starting tracking:', err);
        });
    }

    // If there are no active services and tracking is running → stop it
    if (!hasActiveServices && trackingActiveRef.current) {
      console.log('[ServiceTracking] No active services, stopping tracking');
      stopWorkdayTracking()
        .then(() => {
          trackingActiveRef.current = false;
          console.log('[ServiceTracking] Tracking stopped successfully');
        })
        .catch((err) => {
          console.error('[ServiceTracking] Error stopping tracking:', err);
        });
    }
  }, [services, operationalStatus, startWorkdayTracking, stopWorkdayTracking]);
}
