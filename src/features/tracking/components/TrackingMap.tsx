import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';

interface TrackingMapProps {
  active: boolean;
  latitude: number | null;
  longitude: number | null;
  permissionDenied?: boolean;
}

export function TrackingMap({ active, latitude, longitude, permissionDenied }: TrackingMapProps) {
  const { colors } = useTheme();

  const mapHtml = useMemo(() => {
    if (latitude == null || longitude == null) return null;
    return buildLeafletHtml(latitude, longitude, colors.primary, colors.white);
  }, [latitude, longitude, colors.primary, colors.white]);

  if (!active) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <Text style={[styles.placeholderText, { color: colors.neutral500 }]}>Sin servicio activo</Text>
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>El mapa se activa cuando inicias una ruta</Text>
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.danger }]}>Permiso de ubicación denegado</Text>
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>Actívalo en Ajustes para ver el mapa</Text>
      </View>
    );
  }

  if (!mapHtml) {
    return (
      <View style={[styles.placeholder, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.placeholderSub, { color: colors.neutral400 }]}>Obteniendo ubicación...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.activeBadge, { backgroundColor: colors.successBg }]}>
        <View style={[styles.dot, { backgroundColor: colors.success }]} />
        <Text style={[styles.activeText, { color: colors.successText }]}>Tracking activo</Text>
      </View>

      <View style={[styles.mapWrapper, { backgroundColor: colors.neutral200 }]}>
        <WebView
          source={{ html: mapHtml }}
          style={styles.webview}
          scrollEnabled={false}
          bounces={false}
          mixedContentMode="always"
          originWhitelist={['*']}
          onError={() => {}}
        />
      </View>

      <View style={styles.coordsRow}>
        <Text style={[styles.coordsText, { color: colors.neutral500 }]}>
          {latitude!.toFixed(6)}, {longitude!.toFixed(6)}
        </Text>
        <Text style={[styles.intervalText, { color: colors.neutral400 }]}>Actualización cada 15 s</Text>
      </View>
    </View>
  );
}

function buildLeafletHtml(lat: number, lng: number, primaryColor: string, borderColor: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>html,body,#map{height:100%;margin:0;padding:0;}.leaflet-control-attribution{display:none;}</style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${lat},${lng}],16);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
    var icon=L.divIcon({className:'',html:'<div style="width:18px;height:18px;border-radius:50%;background:${primaryColor};border:3px solid ${borderColor};box-shadow:0 0 0 4px ${primaryColor}4D;"></div>',iconSize:[18,18],iconAnchor:[9,9]});
    L.marker([${lat},${lng}],{icon:icon}).addTo(map).bindPopup('Tu ubicación actual').openPopup();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.lg, gap: spacing.md },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, padding: spacing.xxl },
  placeholderText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  placeholderSub: { fontSize: fontSize.sm, textAlign: 'center' },
  errorText: { fontSize: fontSize.sm, textAlign: 'center' },
  activeBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: borderRadius.full, alignSelf: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  mapWrapper: { flex: 1, borderRadius: borderRadius.lg, overflow: 'hidden', minHeight: 280 },
  webview: { flex: 1 },
  coordsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.xs },
  coordsText: { fontSize: fontSize.xs },
  intervalText: { fontSize: fontSize.xs },
});
