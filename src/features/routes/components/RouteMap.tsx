import React, { useRef, useEffect, useMemo } from 'react'
import { View, StyleSheet, TouchableOpacity, Text, Linking, Alert } from 'react-native'
import { WebView } from 'react-native-webview'
import type WebViewType from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { useTrackingCoords } from '@/features/tracking/hooks/useLocation'
import type { RouteStop } from '../types/routes.types'

interface RouteMapProps {
  stops: RouteStop[]
  /** Index of the currently active (PENDING) stop */
  activeStopIndex: number
}

// ── Navigation helpers ────────────────────────────────────────────────────────

function openInGoogleMaps(destLat: number, destLng: number, courierLat?: number | null, courierLng?: number | null) {
  const origin = courierLat != null && courierLng != null
    ? `&origin=${courierLat},${courierLng}`
    : ''
  const url = `https://www.google.com/maps/dir/?api=1${origin}&destination=${destLat},${destLng}&travelmode=driving`
  Linking.openURL(url).catch(() => Alert.alert('Error', 'No se pudo abrir Google Maps'))
}

function openInWaze(destLat: number, destLng: number) {
  Linking.openURL(`https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`)
    .catch(() => Alert.alert('Error', 'No se pudo abrir Waze'))
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RouteMap({ stops, activeStopIndex }: RouteMapProps) {
  const { colors } = useTheme()
  const webViewRef = useRef<WebViewType>(null)
  const { latitude: courierLat, longitude: courierLng } = useTrackingCoords()

  // Freeze stop data and colors on first render — same pattern as CourierServiceMap.
  // Stops never change identity during a route session; active index updates via postMessage.
  const frozenStops = useRef(stops)
  const frozenPrimary = useRef(colors.primary)
  const frozenWhite = useRef(colors.white)
  const frozenSuccess = useRef(colors.success)
  const frozenDanger = useRef(colors.danger)

  const mapHtml = useMemo(
    () =>
      buildRouteMapHtml(
        frozenStops.current,
        activeStopIndex,
        courierLat ?? null,
        courierLng ?? null,
        frozenPrimary.current,
        frozenWhite.current,
        frozenSuccess.current,
        frozenDanger.current,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // built once — updates go through postMessage
  )

  // Send active stop highlight update when the active index changes
  useEffect(() => {
    webViewRef.current?.postMessage(JSON.stringify({ type: 'activeStop', index: activeStopIndex }))
  }, [activeStopIndex])

  // Send courier position update without reloading the map
  useEffect(() => {
    if (courierLat == null || courierLng == null) return
    webViewRef.current?.postMessage(JSON.stringify({ type: 'courier', lat: courierLat, lng: courierLng }))
  }, [courierLat, courierLng])

  // Active stop for navigation buttons
  const activeStop = stops[activeStopIndex] ?? stops[0]

  return (
    <View style={[styles.container, { borderColor: colors.neutral200 }]}>
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

      {/* Navigation buttons — navigate to the active stop */}
      {activeStop && (
        <View style={styles.navBtns}>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.85}
            onPress={() => openInGoogleMaps(activeStop.lat, activeStop.lng, courierLat, courierLng)}
          >
            <Ionicons name="map-outline" size={13} color={colors.neutral800} />
            <Text style={[styles.navLabel, { color: colors.neutral800 }]}>Maps</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: colors.surface }]}
            activeOpacity={0.85}
            onPress={() => openInWaze(activeStop.lat, activeStop.lng)}
          >
            <Ionicons name="navigate-outline" size={13} color={colors.neutral800} />
            <Text style={[styles.navLabel, { color: colors.neutral800 }]}>Waze</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

// ── Leaflet HTML builder ──────────────────────────────────────────────────────
//
// Renders all route stops as numbered markers with:
//   - Green circle  = COMPLETED stop
//   - Blue circle   = ACTIVE (current) stop — larger, pulsing ring
//   - Grey circle   = PENDING future stop
//   - Blue dot      = Courier current position (updated via postMessage)
//   - Dashed polyline connecting all stops in sequence order
//
// postMessage protocol (from React Native → WebView):
//   { type: 'courier',    lat: number, lng: number }   → move courier marker
//   { type: 'activeStop', index: number }               → highlight new active stop
function buildRouteMapHtml(
  stops: RouteStop[],
  activeStopIndex: number,
  courierLat: number | null,
  courierLng: number | null,
  primaryColor: string,
  borderColor: string,
  successColor: string,
  dangerColor: string,
): string {
  if (!stops.length) return '<html><body style="background:#111"></body></html>'

  // Serialize stop data for use inside the JS bundle
  const stopsJson = JSON.stringify(
    stops.map((s) => ({
      lat: s.lat,
      lng: s.lng,
      type: s.stop_type,
      status: s.status,
      seq: s.sequence_order,
      address: s.address.replace(/'/g, "\\'").replace(/"/g, '\\"'),
    }))
  )

  const courierInit = courierLat != null && courierLng != null
    ? `updateCourier(${courierLat}, ${courierLng});`
    : ''

  const courierDot = `<div style="width:16px;height:16px;border-radius:50%;background:${primaryColor};border:3px solid ${borderColor};box-shadow:0 0 0 4px ${primaryColor}4D;"></div>`

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
    @keyframes pulse-PICKUP {
      0%   { box-shadow: 0 0 0 0 ${successColor}80; }
      70%  { box-shadow: 0 0 0 10px ${successColor}00; }
      100% { box-shadow: 0 0 0 0 ${successColor}00; }
    }
    @keyframes pulse-DELIVERY {
      0%   { box-shadow: 0 0 0 0 ${dangerColor}80; }
      70%  { box-shadow: 0 0 0 10px ${dangerColor}00; }
      100% { box-shadow: 0 0 0 0 ${dangerColor}00; }
    }
    .active-stop-PICKUP { animation: pulse-PICKUP 1.8s infinite; }
    .active-stop-DELIVERY { animation: pulse-DELIVERY 1.8s infinite; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var stops = ${stopsJson};
    var activeIdx = ${activeStopIndex};

    var map = L.map('map', { zoomControl: false, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

    // ── Stop color logic ──────────────────────────────────────────────────
    function stopColor(stop) {
      return stop.type === 'PICKUP' ? '${successColor}' : '${dangerColor}';
    }

    function makeStopIcon(stop, idx) {
      var color = stopColor(stop);
      var size = idx === activeIdx ? 20 : 14;
      var half = size / 2;
      var opacity = stop.status === 'COMPLETED' ? 0.6 : 1;
      var cls = idx === activeIdx ? 'active-stop-' + stop.type : '';
      var html = '<div class="' + cls + '" style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
                 'background:' + color + ';opacity:' + opacity + ';border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);' +
                 'display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;">' +
                 stop.seq + '</div>';
      return L.divIcon({ className: '', html: html, iconSize: [size, size], iconAnchor: [half, half] });
    }

    // ── Draw stops ────────────────────────────────────────────────────────
    var markers = [];
    var latlngs = [];

    stops.forEach(function(stop, idx) {
      var ll = [stop.lat, stop.lng];
      latlngs.push(ll);
      var label = (stop.type === 'PICKUP' ? 'Recogida' : 'Entrega') + ' #' + stop.seq + ': ' + stop.address;
      var m = L.marker(ll, { icon: makeStopIcon(stop, idx) })
               .addTo(map)
               .bindPopup(label);
      markers.push(m);
    });

    // ── Dashed polyline connecting all stops in order ─────────────────────
    var polyline = L.polyline(latlngs, {
      color: '${primaryColor}',
      weight: 2,
      dashArray: '6, 6',
      opacity: 0.7,
    }).addTo(map);

    // ── Courier marker ────────────────────────────────────────────────────
    var courierMarker = null;
    var courierIcon = L.divIcon({
      className: '',
      html: '${courierDot.replace(/'/g, "\\'")}',
      iconSize: [16, 16],
      iconAnchor: [8, 8],
    });

    function updateCourier(lat, lng) {
      if (courierMarker) {
        courierMarker.setLatLng([lat, lng]);
      } else {
        courierMarker = L.marker([lat, lng], { icon: courierIcon }).addTo(map).bindPopup('Tu ubicación');
      }
    }

    // ── Fit bounds to show all stops (+ courier if available) ────────────
    function fitAll() {
      var bounds = L.latLngBounds(latlngs);
      if (courierMarker) bounds.extend(courierMarker.getLatLng());
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    ${courierInit}
    fitAll();

    // ── postMessage handler ───────────────────────────────────────────────
    function handleMessage(event) {
      try {
        var data = JSON.parse(event.data);

        if (data.type === 'courier' && typeof data.lat === 'number') {
          updateCourier(data.lat, data.lng);
        }

        if (data.type === 'activeStop' && typeof data.index === 'number') {
          activeIdx = data.index;
          // Refresh all marker icons to reflect new active stop
          stops.forEach(function(stop, idx) {
            markers[idx].setIcon(makeStopIcon(stop, idx));
          });
          // Pan to the new active stop
          if (stops[activeIdx]) {
            map.panTo([stops[activeIdx].lat, stops[activeIdx].lng]);
          }
        }
      } catch (e) {}
    }

    document.addEventListener('message', handleMessage); // Android
    window.addEventListener('message', handleMessage);   // iOS
  </script>
</body>
</html>`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    height: 280,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    marginBottom: spacing.md,
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
})
