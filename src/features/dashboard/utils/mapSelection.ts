import type { Service } from '@/features/services/types/services.types';
import type { RouteStop } from '@/features/routes/types/routes.types';
import { toFiniteCoord } from '@/shared/utils/coordinates';

export type MapPointKind = 'pickup' | 'delivery' | 'stop';

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  kind: MapPointKind;
  label: string;
  seq?: number;
  status?: 'PENDING' | 'COMPLETED';
}

/** Maps a standalone service to its pickup + delivery map points. */
export function serviceToMapPoints(service: Service): MapPoint[] {
  const points: MapPoint[] = [];
  const originLat = toFiniteCoord(service.origin_lat);
  const originLng = toFiniteCoord(service.origin_lng);
  const destinationLat = toFiniteCoord(service.destination_lat);
  const destinationLng = toFiniteCoord(service.destination_lng);

  if (originLat != null && originLng != null) {
    points.push({
      id: `${service.id}-pickup`,
      lat: originLat,
      lng: originLng,
      kind: 'pickup',
      label: `Recogida: ${service.origin_address}`,
    });
  }

  if (destinationLat != null && destinationLng != null) {
    points.push({
      id: `${service.id}-delivery`,
      lat: destinationLat,
      lng: destinationLng,
      kind: 'delivery',
      label: `Entrega: ${service.destination_address}`,
    });
  }

  return points;
}

/** Maps every stop of a route to a numbered map point. */
export function routeStopsToMapPoints(stops: RouteStop[]): MapPoint[] {
  if (!Array.isArray(stops)) return [];

  return stops
    .map((stop): MapPoint | null => {
      if (stop == null) return null;

      const lat = toFiniteCoord(stop.lat);
      const lng = toFiniteCoord(stop.lng);
      if (lat == null || lng == null) return null;

      return {
        id: stop.id,
        lat,
        lng,
        kind: 'stop',
        label: `${stop.stop_type === 'PICKUP' ? 'Recogida' : 'Entrega'} #${stop.sequence_order}: ${stop.address}`,
        seq: stop.sequence_order,
        status: stop.status,
      };
    })
    .filter((point): point is MapPoint => point !== null);
}

export function hasMapPoints(points: MapPoint[]): boolean {
  return points.length > 0;
}
