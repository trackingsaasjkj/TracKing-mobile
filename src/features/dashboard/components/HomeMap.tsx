import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import type WebViewType from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { borderRadius, spacing } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { useMapDefaultsStore } from '@/shared/utils/mapDefaults';
import type { MapPoint } from '../utils/mapSelection';

interface HomeMapProps {
  latitude: number | null;
  longitude: number | null;
  permissionDenied: boolean;
  /** Points to draw for the selected service/route (empty = none) */
  selection: MapPoint[];
  /** Stable key that changes whenever the selection changes */
  selectionKey: string;
  /** Height obscured by the bottom sheet — used to pad fitBounds */
  bottomInset: number;
  /** Increment to ask the map to re-center on the courier */
  recenterToken: number;
  onRecenter: () => void;
}

export function HomeMap({
  latitude,
  longitude,
  permissionDenied,
  selection,
  selectionKey,
  bottomInset,
  recenterToken,
  onRecenter,
}: HomeMapProps) {
  const { colors } = useTheme();
  const defaults = useMapDefaultsStore((s) => s.defaults);
  const webViewRef = useRef<WebViewType<{}>>(null);
  const hasCentered = useRef(false);
  // Last values sent to the WebView, replayed once the page finishes loading so
  // selections made before Leaflet is ready are not lost.
  const lastCourier = useRef<{ lat: number; lng: number } | null>(null);
  const lastSelection = useRef<{ points: MapPoint[]; bottomInset: number }>({
    points: [],
    bottomInset,
  });

  // Freeze the first valid position so the HTML is built only once. All later
  // updates flow through postMessage — no WebView reload on every GPS tick.
  const initialCourier = useRef<{ lat: number; lng: number } | null>(null);
  if (
    initialCourier.current == null &&
    latitude != null &&
    longitude != null
  ) {
    initialCourier.current = { lat: latitude, lng: longitude };
  }

  const mapHtml = useMemo(
    () =>
      buildHomeMapHtml(
        initialCourier.current,
        defaults,
        colors.mapCourier,
        colors.mapPickup,
        colors.mapDelivery,
        colors.mapRoute,
      ),
    // Built once per theme; coordinates are delivered via postMessage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      colors.mapCourier,
      colors.mapPickup,
      colors.mapDelivery,
      colors.mapRoute,
      defaults.lat,
      defaults.lng,
    ],
  );

  // Courier updates (and first-time centering)
  useEffect(() => {
    if (latitude == null || longitude == null) return;
    lastCourier.current = { lat: latitude, lng: longitude };
    if (!webViewRef.current) return;
    const shouldCenter = !hasCentered.current;
    hasCentered.current = true;
    webViewRef.current.postMessage(
      JSON.stringify({
        type: 'courier',
        lat: latitude,
        lng: longitude,
        center: shouldCenter,
      }),
    );
  }, [latitude, longitude]);

  // Selection updates
  useEffect(() => {
    lastSelection.current = { points: selection, bottomInset };
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: 'selection',
        points: selection,
        bottomInset,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, bottomInset]);

  // Explicit recenter requests
  useEffect(() => {
    if (recenterToken === 0) return;
    webViewRef.current?.postMessage(
      JSON.stringify({ type: 'recenter', lat: latitude, lng: longitude }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterToken]);

  return (
    <View style={styles.container}>
      <WebView<{}>
        ref={webViewRef}
        source={{ html: mapHtml }}
        style={styles.webview}
        scrollEnabled={false}
        bounces={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        onLoadEnd={() => {
          if (lastCourier.current) {
            webViewRef.current?.postMessage(
              JSON.stringify({ type: 'courier', ...lastCourier.current }),
            );
          }
          webViewRef.current?.postMessage(
            JSON.stringify({ type: 'selection', ...lastSelection.current }),
          );
        }}
        onError={() => {}}
        javaScriptEnabled
        domStorageEnabled
      />

      {/* Recenter button — floats above the collapsed sheet */}
      <TouchableOpacity
        onPress={onRecenter}
        activeOpacity={0.85}
        style={[
          styles.recenterBtn,
          {
            bottom: bottomInset + spacing.lg,
            backgroundColor: colors.overlaySurface,
            shadowColor: colors.black,
          },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Centrar en mi ubicación"
      >
        <Ionicons name="locate" size={20} color={colors.primary} />
      </TouchableOpacity>

      {/* Permission denied overlay */}
      {permissionDenied ? (
        <View
          style={[
            styles.notice,
            {
              bottom: bottomInset + spacing.lg,
              backgroundColor: colors.overlaySurface,
              shadowColor: colors.black,
            },
          ]}
        >
          <Ionicons name="location-outline" size={18} color={colors.danger} />
          <View style={styles.noticeTextWrap}>
            <Text style={[styles.noticeTitle, { color: colors.neutral800 }]}>
              Ubicación desactivada
            </Text>
            <Text style={[styles.noticeSub, { color: colors.neutral500 }]}>
              Actívala para que el mapa muestre tu posición
            </Text>
          </View>
        </View>
      ) : latitude == null || longitude == null ? (
        <View
          style={[
            styles.notice,
            {
              bottom: bottomInset + spacing.lg,
              backgroundColor: colors.overlaySurface,
              shadowColor: colors.black,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.noticeSub, { color: colors.neutral500 }]}>
            Obteniendo ubicación...
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// ─── Leaflet HTML builder ────────────────────────────────────────────────────
//
// Leaflet + OpenStreetMap (free, no API key). The map is built once and then
// driven entirely via postMessage:
//
//   { type:'courier',   lat, lng, center }       → move courier marker
//   { type:'selection', points, bottomInset }    → redraw selection layer
//   { type:'recenter',  lat?, lng? }             → fly back to courier
//
// Selection markers:
//   pickup   → green "A"/numbered pin
//   delivery → red "B"/numbered pin
//   stop     → numbered circle (route); completed stops are faded
function buildHomeMapHtml(
  initialCourier: { lat: number; lng: number } | null,
  defaults: { lat: number; lng: number },
  courierColor: string,
  pickupColor: string,
  deliveryColor: string,
  routeColor: string,
): string {
  const startLat = initialCourier?.lat ?? defaults.lat;
  const startLng = initialCourier?.lng ?? defaults.lng;
  const startZoom = initialCourier ? 16 : 14;
  const courierInit = initialCourier
    ? `updateCourier(${initialCourier.lat}, ${initialCourier.lng});`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #e5e7eb; }
    .leaflet-control-attribution { display: none; }
    @keyframes courierPulse {
      0%   { box-shadow: 0 0 0 0 ${courierColor}8C; }
      70%  { box-shadow: 0 0 0 16px ${courierColor}00; }
      100% { box-shadow: 0 0 0 0 ${courierColor}00; }
    }
    .courier-dot {
      width: 18px; height: 18px; border-radius: 50%;
      background: ${courierColor}; border: 3px solid #ffffff;
      animation: courierPulse 2s infinite;
    }
    @keyframes stopPulse {
      0%   { box-shadow: 0 0 0 0 rgba(29, 78, 216, 0.55); }
      70%  { box-shadow: 0 0 0 12px rgba(29, 78, 216, 0); }
      100% { box-shadow: 0 0 0 0 rgba(29, 78, 216, 0); }
    }
    .stop-pin {
      display: flex; align-items: center; justify-content: center;
      color: #ffffff; font-weight: 700; font-family: -apple-system, Roboto, sans-serif;
      border: 2px solid #ffffff; box-shadow: 0 1px 5px rgba(0,0,0,.35);
    }
    .stop-active { animation: stopPulse 1.8s infinite; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
      tap: false,
    }).setView([${startLat}, ${startLng}], ${startZoom});

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var courierMarker = null;
    var hasSelection = false;
    var courierLat = ${initialCourier ? initialCourier.lat : 'null'};
    var courierLng = ${initialCourier ? initialCourier.lng : 'null'};

    var courierIcon = L.divIcon({
      className: '',
      html: '<div class="courier-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    function updateCourier(lat, lng, center) {
      courierLat = lat;
      courierLng = lng;
      if (courierMarker) {
        courierMarker.setLatLng([lat, lng]);
      } else {
        courierMarker = L.marker([lat, lng], { icon: courierIcon })
          .addTo(map)
          .bindPopup('Tu ubicación actual');
      }
      if (center && !hasSelection) {
        map.setView([lat, lng], 16);
      }
    }

    var selectionLayer = L.layerGroup().addTo(map);

    function markerIcon(point, isActive) {
      var color = point.kind === 'pickup' ? '${pickupColor}'
        : point.kind === 'delivery' ? '${deliveryColor}' : '${routeColor}';
      var label = point.kind === 'stop'
        ? String(point.seq || '')
        : (point.kind === 'pickup' ? 'A' : 'B');
      var size = isActive ? 26 : 20;
      var opacity = point.status === 'COMPLETED' ? 0.5 : 1;
      var cls = 'stop-pin' + (isActive ? ' stop-active' : '');
      var html = '<div class="' + cls + '" style="width:' + size + 'px;height:' + size +
        'px;border-radius:50%;background:' + color + ';opacity:' + opacity +
        ';font-size:' + (isActive ? 11 : 9) + 'px;">' + label + '</div>';
      return L.divIcon({
        className: '',
        html: html,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      });
    }

    function clearSelection() {
      selectionLayer.clearLayers();
      hasSelection = false;
    }

    function drawSelection(points, bottomInset) {
      clearSelection();
      if (!points || !points.length) return;

      hasSelection = true;

      var ordered = points.slice().sort(function (a, b) {
        if (typeof a.seq === 'number' && typeof b.seq === 'number') return a.seq - b.seq;
        return 0;
      });

      // The next pending stop (route mode) gets a larger pulsing marker
      var activeSeq = null;
      for (var i = 0; i < ordered.length; i++) {
        if (ordered[i].kind === 'stop' && ordered[i].status !== 'COMPLETED') {
          activeSeq = ordered[i].seq;
          break;
        }
      }

      var latlngs = [];
      ordered.forEach(function (point) {
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') return;
        var ll = [point.lat, point.lng];
        latlngs.push(ll);
        var isActive = activeSeq != null && point.seq === activeSeq;
        L.marker(ll, { icon: markerIcon(point, isActive) })
          .addTo(selectionLayer)
          .bindPopup(point.label || '');
      });

      if (latlngs.length > 1) {
        L.polyline(latlngs, {
          color: '${routeColor}',
          weight: 2,
          dashArray: '6, 6',
          opacity: 0.75,
        }).addTo(selectionLayer);
      }

      var bounds = L.latLngBounds(latlngs);
      if (courierLat != null && courierLng != null) {
        bounds.extend([courierLat, courierLng]);
      }
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          paddingTopLeft: [40, 72],
          paddingBottomRight: [40, (bottomInset || 0) + 24],
          maxZoom: 16,
        });
      }
    }

    function recenter(lat, lng) {
      var targetLat = typeof lat === 'number' ? lat : courierLat;
      var targetLng = typeof lng === 'number' ? lng : courierLng;
      if (targetLat == null || targetLng == null) return;
      map.flyTo([targetLat, targetLng], 16, { duration: 0.6 });
    }

    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);
        if (data.type === 'courier' && typeof data.lat === 'number') {
          updateCourier(data.lat, data.lng, data.center === true);
        } else if (data.type === 'selection') {
          drawSelection(data.points, data.bottomInset);
        } else if (data.type === 'recenter') {
          recenter(data.lat, data.lng);
        }
      } catch (e) {}
    }

    ${courierInit}

    document.addEventListener('message', handleMessage); // Android
    window.addEventListener('message', handleMessage);   // iOS
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  notice: {
    position: 'absolute',
    left: spacing.lg,
    right: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  noticeTextWrap: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  noticeSub: {
    fontSize: fontSize.xs,
    flexShrink: 1,
  },
});
