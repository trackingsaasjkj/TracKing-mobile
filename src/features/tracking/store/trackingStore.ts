import { create } from 'zustand';

/**
 * Shared store for the courier's live GPS coordinates.
 *
 * Why this exists:
 *   useLocation is called in two places — TrackingScreen and ServiceDetailScreen.
 *   Without a shared store, each instance would run its own 15s foreground interval,
 *   doubling the location reports sent to the backend.
 *
 *   The solution: useLocation writes coords here, and both screens read from this
 *   store. Only one useLocation instance runs at a time (the one in TrackingScreen
 *   is always mounted; ServiceDetailScreen's instance is only mounted when the user
 *   opens a service detail). The background task is already guarded against double
 *   registration by the hasStartedLocationUpdatesAsync check in useLocation.
 *
 *   For the foreground interval, ServiceDetailScreen now reads coords from this
 *   store instead of calling useLocation directly — see useTrackingCoords hook.
 */
interface TrackingState {
  latitude: number | null;
  longitude: number | null;
  permissionDenied: boolean;
  setCoords: (lat: number, lng: number) => void;
  setPermissionDenied: (denied: boolean) => void;
  clearCoords: () => void;
}

export const useTrackingStore = create<TrackingState>((set) => ({
  latitude: null,
  longitude: null,
  permissionDenied: false,

  setCoords: (lat, lng) => set({ latitude: lat, longitude: lng }),
  setPermissionDenied: (denied) => set({ permissionDenied: denied }),
  clearCoords: () => set({ latitude: null, longitude: null, permissionDenied: false }),
}));
