import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Linking, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { fontSize, fontWeight } from '@/shared/ui/typography';

export interface CourierServiceMapProps {
  originLat: number;
  originLng: number;
  originAddress: string;
  destinationLat: number;
  destinationLng: number;
  destinationAddress: string;
  /** Optional: current courier GPS position */
  courierLat?: number | null;
  courierLng?: number | null;
  /**
   * When true the map fills its parent container (flex: 1) instead of using
   * the fixed 260px height used inside ServiceDetailScreen's scroll view.
   */
  fullScreen?: boolean;
  /**
   * Controls which point the Maps/Waze navigation buttons target.
   * - 'pickup'   → navigate to origin (recogida) — used when status is ASSIGNED or ACCEPTED
   * - 'delivery' → navigate to destination (entrega) — used when status is IN_TRANSIT
   * Defaults to 'delivery' for backwards compatibility.
   */
  navigationTarget?: 'pickup' | 'delivery';
}

/**
 * Opens the origin → destination route in Google Maps (external app).
 * Falls back to Google Maps web if the native app is not installed.
 *
 * URL format:
 *   https://www.google.com/maps/dir/?api=1&origin=LAT,LNG&destination=LAT,LNG&travelmode=driving
 */
function openInGoogleMaps(
  oLat: number, oLng: number,
  dLat: number, dLng: number,
) {
  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&origin=${oLat},${oLng}` +
    `&destination=${dLat},${dLng}` +
    `&travelmode=driving`;

  Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'No se pudo abrir Google Maps'),
  );
}

/**
 * Opens the destination in Waze (external app).
 * Waze deep link only supports a single destination (no waypoints).
 * Falls back to Waze web if the native app is not installed.
 *
 * URL format:
 *   https://waze.com/ul?ll=LAT,LNG&navigate=yes
 */
function openInWaze(dLat: number, dLng: number) {
  const url = `https://waze.com/ul?ll=${dLat},${dLng}&navigate=yes`;
  Linking.openURL(url).catch(() =>
    Alert.alert('Error', 'No se pudo abrir Waze'),
  );
}

export function CourierServiceMap({
  originLat,
  originLng,
  originAddress,
  destinationLat,
  destinationLng,
  destinationAddress,
  courierLat,
  courierLng,
  fullScreen = false,
  navigationTarget = 'delivery',
}: CourierServiceMapProps) {
  const { colors } = useTheme();
  const webViewRef = useRef<WebViewType>(null);

  // Resolve which point Maps/Waze should navigate to based on the current phase
  const navLat = navigationTarget === 'pickup' ? originLat : destinationLat;
  const navLng = navigationTarget === 'pickup' ? originLng : destinationLng;

  // Freeze the static map coordinates on first render.
  // The map HTML must never be rebuilt after mount — doing so causes a full
  // WebView reload which re-downloads Leaflet from the network (~300-600ms).
  // Courier position updates are handled via postMessage (no reload needed).
  // Origin/destination never change for the same service, so freezing is safe.
  const frozenOriginLat = useRef(originLat);
  const frozenOriginLng = useRef(originLng);
  const frozenOriginAddress = useRef(originAddress);
  const frozenDestLat = useRef(destinationLat);
  const frozenDestLng = useRef(destinationLng);
  const frozenDestAddress = useRef(destinationAddress);
  const frozenPrimary = useRef(colors.primary);
  const frozenWhite = useRef(colors.white);

  // Build the HTML exactly once — deps array is intentionally empty.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const mapHtml = useMemo(
    () =>
      buildServiceMapHtml(
        frozenOriginLat.current,
        frozenOriginLng.current,
        frozenOriginAddress.current,
        frozenDestLat.current,
        frozenDestLng.current,
        frozenDestAddress.current,
        courierLat ?? null,
        courierLng ?? null,
        frozenPrimary.current,
        frozenWhite.current,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Update courier marker position without reloading the map
  useEffect(() => {
    if (courierLat == null || courierLng == null || !webViewRef.current) return;
    webViewRef.current.postMessage(
      JSON.stringify({ type: 'courier', lat: courierLat, lng: courierLng }),
    );
  }, [courierLat, courierLng]);

  return (
    <View style={[
      styles.container,
      { borderColor: colors.neutral200 },
      fullScreen && styles.containerFullScreen,
    ]}>
      <WebView
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.map}
        scrollEnabled={false}
        bounces={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        onError={() => {}}
      />

      {/* Navigation buttons — overlaid on top-right corner of the map */}
      <View style={styles.navBtns}>
        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: colors.surface }]}
          activeOpacity={0.85}
          onPress={() => openInGoogleMaps(
            courierLat ?? originLat, courierLng ?? originLng,
            navLat, navLng,
          )}
        >
          <Ionicons name="map-outline" size={13} color={colors.neutral800} />
          <Text style={[styles.navLabel, { color: colors.neutral800 }]}>Maps</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navBtn, { backgroundColor: colors.surface }]}
          activeOpacity={0.85}
          onPress={() => openInWaze(navLat, navLng)}
        >
          <Ionicons name="navigate-outline" size={13} color={colors.neutral800} />
          <Text style={[styles.navLabel, { color: colors.neutral800 }]}>Waze</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
// Why WebView + Leaflet instead of react-native-maps:
//   - react-native-maps defaults to Google Maps which requires billing setup
//   - Leaflet + OpenStreetMap is 100% free, no API key needed
//   - Same visual quality, supports fitBounds natively via Leaflet API
//   - Courier marker updates via postMessage — no full reload on each GPS tick
function buildServiceMapHtml(
  oLat: number,
  oLng: number,
  oAddress: string,
  dLat: number,
  dLng: number,
  dAddress: string,
  cLat: number | null,
  cLng: number | null,
  primaryColor: string,
  borderColor: string,
): string {
  const hasCourier = cLat != null && cLng != null;
  const courierInit = hasCourier
    ? `addCourierMarker(${cLat}, ${cLng});`
    : '';

  const courierMarkerHtml = `<div style="width:16px;height:16px;border-radius:50%;background:${primaryColor};border:3px solid ${borderColor};box-shadow:0 0 0 4px ${primaryColor}4D;"></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html,body,#map { height:100%; margin:0; padding:0; }
    .leaflet-control-attribution { display:none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false });

    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }
    ).addTo(map);

    // Origin pin — green
    var originMarker = L.marker([${oLat}, ${oLng}], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#4CAF7D;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
    }).addTo(map).bindPopup('Recogida: ${oAddress.replace(/'/g, "\\'")}');

    // Destination pin — red
    var destMarker = L.marker([${dLat}, ${dLng}], {
      icon: L.divIcon({
        className: '',
        html: '<div style="width:14px;height:14px;border-radius:50%;background:#E53E3E;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      })
    }).addTo(map).bindPopup('Entrega: ${dAddress.replace(/'/g, "\\'")}');

    // Courier marker — created on demand, updated via postMessage
    var courierMarker = null;
    var courierIcon = L.divIcon({
      className: '',
      html: '${courierMarkerHtml.replace(/'/g, "\\'")}',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    function addCourierMarker(lat, lng) {
      if (courierMarker) {
        courierMarker.setLatLng([lat, lng]);
      } else {
        courierMarker = L.marker([lat, lng], { icon: courierIcon })
                         .addTo(map)
                         .bindPopup('Tu ubicación');
      }
    }

    // Fit map to show all relevant markers
    function fitBounds() {
      var coords = [[${oLat}, ${oLng}], [${dLat}, ${dLng}]];
      if (courierMarker) coords.push(courierMarker.getLatLng());
      map.fitBounds(coords, { padding: [40, 40] });
    }

    // Initial courier marker (if coords were available at render time)
    ${courierInit}
    fitBounds();

    // Listen for courier position updates from React Native
    document.addEventListener('message', handleMessage);  // Android
    window.addEventListener('message', handleMessage);    // iOS

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'courier' && typeof data.lat === 'number') {
          addCourierMarker(data.lat, data.lng);
        }
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  // Full-screen mode: fills parent, no fixed height, no margin, no border radius
  containerFullScreen: {
    height: undefined,
    flex: 1,
    borderRadius: 0,
    borderWidth: 0,
    marginVertical: 0,
  },
  map: { flex: 1 },
  navBtns: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.xs,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 4,
  },
  navLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
});
