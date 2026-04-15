import React, { useRef, useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { useTheme } from '@/shared/ui/useTheme';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { MAPTILER_KEY } from '@/config/map';

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
}: CourierServiceMapProps) {
  const { colors } = useTheme();
  const webViewRef = useRef<WebViewType>(null);

  // Build the HTML once with the static origin/destination pins.
  // The courier marker is updated via postMessage to avoid full reloads.
  const mapHtml = useMemo(
    () =>
      buildServiceMapHtml(
        originLat,
        originLng,
        originAddress,
        destinationLat,
        destinationLng,
        destinationAddress,
        courierLat ?? null,
        courierLng ?? null,
        colors.primary,
        colors.white,
        MAPTILER_KEY,
      ),
    // Only rebuild if static data changes — courier coords are handled via postMessage
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [originLat, originLng, destinationLat, destinationLng, colors.primary, colors.white],
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
    </View>
  );
}

// ─── HTML builder ─────────────────────────────────────────────────────────────
// Why WebView + Leaflet instead of react-native-maps:
//   - react-native-maps defaults to Google Maps which requires billing setup
//   - Leaflet + Maptiler is 100% free up to 100k tiles/mo, no credit card needed
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
  maptilerKey: string,
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
      'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${maptilerKey}',
      { maxZoom: 19 }
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
});
