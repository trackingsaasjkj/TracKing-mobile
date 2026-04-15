import React, { useRef, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { MAPTILER_KEY } from '@/config/map';

interface TrackingMapProps {
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  permissionDenied?: boolean;
}

export function TrackingMap({ active, latitude, longitude, permissionDenied }: TrackingMapProps) {
  const { colors } = useTheme();
  const webViewRef = useRef<WebViewType>(null);

  // Build the initial HTML only once when we first get valid coords.
  // After that, coordinate updates are sent via postMessage — no full reload.
  const initialCoords = useRef<{ lat: number; lng: number } | null>(null);
  if (latitude != null && longitude != null && initialCoords.current == null) {
    initialCoords.current = { lat: latitude, lng: longitude };
  }

  const mapHtml = useMemo(() => {
    if (initialCoords.current == null) return null;
    return buildLeafletHtml(
      initialCoords.current.lat,
      initialCoords.current.lng,
      colors.primary,
      colors.white,
      MAPTILER_KEY,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCoords.current, colors.primary, colors.white]);

  // When coords change, update the marker via postMessage instead of rebuilding HTML.
  // This avoids the WebView full-reload flicker on every 15s GPS update.
  useEffect(() => {
    if (latitude == null || longitude == null || !webViewRef.current) return;
    webViewRef.current.postMessage(JSON.stringify({ lat: latitude, lng: longitude }));
  }, [latitude, longitude]);

  // ── Inactive state ──────────────────────────────────────────────────────────
  if (!active) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <Text style={[styles.placeholderText, { color: colors.neutral500 }]}>Sin servicio activo</Text>
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>
          El mapa se activa cuando inicias una ruta
        </Text>
      </View>
    );
  }

  // ── Permission denied ───────────────────────────────────────────────────────
  if (permissionDenied) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Permiso de ubicación denegado</Text>
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>
          Actívalo en Ajustes para ver el mapa
        </Text>
      </View>
    );
  }

  // ── Waiting for first GPS fix ───────────────────────────────────────────────
  if (!mapHtml) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  // ── Map ─────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Active badge */}
      <View style={[styles.activeBadge, { backgroundColor: colors.successBg }]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={[styles.activeText, { color: colors.successText }]}>Tracking activo</Text>
      </View>

      <View style={[styles.mapWrapper, { backgroundColor: colors.neutral200 }]}>
        <WebView
          ref={webViewRef}
          source={{ html: mapHtml }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          // Allow mixed content so Leaflet tiles load over HTTP in dev builds
          mixedContentMode="always"
          originWhitelist={['*']}
          onError={() => {}}
        />
      </View>

      {/* Coordinates footer */}
      {latitude != null && longitude != null && (
        <View style={styles.coordsRow}>
          <Text style={[styles.coordsText, { color: colors.neutral500 }]}>
            {latitude.toFixed(6)}, {longitude.toFixed(6)}
          </Text>
          <Text style={[styles.intervalText, { color: colors.neutral400 }]}>Actualización cada 15 s</Text>
        </View>
      )}
    </View>
  );
}

// ─── Leaflet HTML builder ────────────────────────────────────────────────────
// Leaflet CSS/JS are inlined as data URIs via CDN on first load, then cached by
// the WebView. The map listens for postMessage events to update the marker
// position without a full page reload.
//
// Why Maptiler instead of OSM tiles directly:
//   - OSM tile servers have usage policies that restrict commercial/high-volume apps
//   - Maptiler provides a CDN-backed tile service with a generous free tier (100k tiles/mo)
//     and predictable paid tiers for scale
//   - Same OSM data, better reliability for production use
function buildLeafletHtml(
  lat: number,
  lng: number,
  primaryColor: string,
  borderColor: string,
  maptilerKey: string,
): string {
  const markerHtml = `<div style="width:18px;height:18px;border-radius:50%;background:${primaryColor};border:3px solid ${borderColor};box-shadow:0 0 0 4px ${primaryColor}4D;"></div>`;

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
    var map = L.map('map', { zoomControl: true, attributionControl: false })
               .setView([${lat}, ${lng}], 16);

    // Maptiler Streets tile layer — commercial-friendly, CDN-backed
    L.tileLayer(
      'https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${maptilerKey}',
      { maxZoom: 19 }
    ).addTo(map);

    var icon = L.divIcon({
      className: '',
      html: '${markerHtml.replace(/'/g, "\\'")}',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    var marker = L.marker([${lat}, ${lng}], { icon: icon })
                  .addTo(map)
                  .bindPopup('Tu ubicación actual')
                  .openPopup();

    // Listen for coordinate updates sent via WebView.postMessage.
    // This moves the marker and pans the map without a full page reload,
    // avoiding the flicker that would occur if we rebuilt the HTML every 15s.
    document.addEventListener('message', handleMessage);   // Android
    window.addEventListener('message', handleMessage);     // iOS

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (typeof data.lat === 'number' && typeof data.lng === 'number') {
          var latlng = [data.lat, data.lng];
          marker.setLatLng(latlng);
          map.panTo(latlng);
        }
      } catch (e) {}
    }
  </script>
</body>
</html>`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.xxl,
  },
  placeholderText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  placeholderSub: { fontSize: fontSize.sm, textAlign: 'center' },
  errorText: { fontSize: fontSize.sm, textAlign: 'center' },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  mapWrapper: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden', minHeight: 280 },
  webview: { flex: 1 },
  coordsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  coordsText: { fontSize: fontSize.xs },
  intervalText: { fontSize: fontSize.xs },
});
