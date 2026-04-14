import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Callout, Region } from 'react-native-maps';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';

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
}

const EDGE_PADDING = { top: 60, right: 60, bottom: 60, left: 60 };

export function CourierServiceMap({
  originLat,
  originLng,
  originAddress,
  destinationLat,
  destinationLng,
  destinationAddress,
  courierLat,
  courierLng,
}: CourierServiceMapProps) {
  const { colors } = useTheme();
  const mapRef = useRef<MapView>(null);

  const originCoord = { latitude: originLat, longitude: originLng };
  const destCoord = { latitude: destinationLat, longitude: destinationLng };

  const handleMapReady = () => {
    const coords = [originCoord, destCoord];
    if (courierLat != null && courierLng != null) {
      coords.push({ latitude: courierLat, longitude: courierLng });
    }
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: EDGE_PADDING,
      animated: false,
    });
  };

  return (
    <View style={[styles.container, { borderColor: colors.neutral200 }]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        onMapReady={handleMapReady}
        initialRegion={initialRegion(originLat, originLng, destinationLat, destinationLng)}
      >
        {/* Origin pin — green */}
        <Marker
          coordinate={originCoord}
          pinColor="#4CAF7D"
          testID="marker-origin"
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Recogida</Text>
              <Text style={styles.calloutText}>{originAddress}</Text>
            </View>
          </Callout>
        </Marker>

        {/* Destination pin — red */}
        <Marker
          coordinate={destCoord}
          pinColor="#E53E3E"
          testID="marker-destination"
        >
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>Entrega</Text>
              <Text style={styles.calloutText}>{destinationAddress}</Text>
            </View>
          </Callout>
        </Marker>

        {/* Courier current position — blue */}
        {courierLat != null && courierLng != null && (
          <Marker
            coordinate={{ latitude: courierLat, longitude: courierLng }}
            pinColor="#3B82F6"
            testID="marker-courier"
          >
            <Callout>
              <View style={styles.callout}>
                <Text style={styles.calloutTitle}>Tu ubicación</Text>
              </View>
            </Callout>
          </Marker>
        )}
      </MapView>
    </View>
  );
}

/** Compute an initial region that roughly fits both points */
function initialRegion(oLat: number, oLng: number, dLat: number, dLng: number): Region {
  const midLat = (oLat + dLat) / 2;
  const midLng = (oLng + dLng) / 2;
  const latDelta = Math.abs(oLat - dLat) * 2 + 0.02;
  const lngDelta = Math.abs(oLng - dLng) * 2 + 0.02;
  return { latitude: midLat, longitude: midLng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: spacing.sm,
  },
  map: { flex: 1 },
  callout: { padding: spacing.xs, maxWidth: 200 },
  calloutTitle: { fontSize: fontSize.sm, fontWeight: '600', marginBottom: 2 },
  calloutText: { fontSize: fontSize.xs, color: '#555' },
});
