import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing } from '@/shared/ui/spacing';
import { useLocation } from '../hooks/useLocation';
import { useTrackingCoords } from '../hooks/useLocation';
import { CourierServiceMap } from '@/features/services/components/CourierServiceMap';

/**
 * TrackingScreen — full-screen map tab for the courier.
 *
 * Rendering logic:
 *   1. Courier is IN_SERVICE + active service has geocoded coords
 *      → CourierServiceMap with origin pin, destination pin, and live courier dot.
 *        The courier dot updates every 15s via postMessage (no WebView reload).
 *
 *   2. Courier is IN_SERVICE but service lacks geocoded coords
 *      → Informational message. Geocoding may not have run yet for this service.
 *
 *   3. Courier is not IN_SERVICE (AVAILABLE or UNAVAILABLE)
 *      → Empty state prompting the courier to start a route.
 *
 * Why CourierServiceMap instead of TrackingMap here:
 *   CourierServiceMap already handles origin + destination + courier markers,
 *   fitBounds, and postMessage updates. Reusing it avoids duplicating that logic
 *   in TrackingMap and keeps a single source of truth for the service map UI.
 *
 * Why useLocation is called here (not just useTrackingCoords):
 *   TrackingScreen is always mounted (it's a tab). It owns the tracking lifecycle —
 *   starting/stopping the foreground interval and background task based on
 *   operationalStatus. ServiceDetailScreen uses useTrackingCoords (read-only)
 *   to avoid creating a second interval.
 */
export function TrackingScreen() {
  const { colors } = useTheme();
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
  const isInService = operationalStatus === 'IN_SERVICE';

  // This hook owns the tracking lifecycle for the whole app.
  // It writes coords to trackingStore so other screens can read them.
  useLocation({ active: isInService });

  // Read coords from the shared store (written by useLocation above)
  const { latitude, longitude } = useTrackingCoords();

  // Find the active service (ACCEPTED or IN_TRANSIT) from the shared store.
  // servicesStore is already populated by useDashboard / useServices.
  const activeService = useServicesStore((s) =>
    s.services.find((svc) => svc.status === 'ACCEPTED' || svc.status === 'IN_TRANSIT'),
  );

  const hasGeocoords =
    activeService?.origin_lat != null &&
    activeService?.origin_lng != null &&
    activeService?.destination_lat != null &&
    activeService?.destination_lng != null;

  // ── No active service ───────────────────────────────────────────────────────
  if (!isInService || !activeService) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={[styles.emptyTitle, { color: colors.neutral800 }]}>Sin ruta activa</Text>
          <Text style={[styles.emptySub, { color: colors.neutral500 }]}>
            El mapa se activa cuando inicias una ruta
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Service active but no geocoded coords ───────────────────────────────────
  if (!hasGeocoords) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={[styles.emptyTitle, { color: colors.neutral800 }]}>Coordenadas no disponibles</Text>
          <Text style={[styles.emptySub, { color: colors.neutral500 }]}>
            Este servicio aún no tiene coordenadas geocodificadas
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Full-screen service map ─────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <CourierServiceMap
        originLat={Number(activeService.origin_lat)}
        originLng={Number(activeService.origin_lng)}
        originAddress={activeService.origin_address}
        destinationLat={Number(activeService.destination_lat)}
        destinationLng={Number(activeService.destination_lng)}
        destinationAddress={activeService.destination_address}
        courierLat={latitude}
        courierLng={longitude}
        fullScreen
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: spacing.sm },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center' },
  emptySub: { fontSize: fontSize.sm, textAlign: 'center' },
});
