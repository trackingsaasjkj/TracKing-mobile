import {
  hasMapPoints,
  routeStopsToMapPoints,
  serviceToMapPoints,
} from '@/features/dashboard/utils/mapSelection';
import type { Service } from '@/features/services/types/services.types';
import type { RouteStop } from '@/features/routes/types/routes.types';

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 's1',
    status: 'ASSIGNED',
    origin_address: 'Calle 10',
    destination_address: 'Carrera 15',
    destination_name: 'Destino',
    package_details: '',
    payment_status: 'PAID',
    is_settled_courier: false,
    is_settled_customer: false,
    total_price: 0,
    delivery_price: 0,
    product_price: 0,
    origin_lat: 4.71,
    origin_lng: -74.07,
    destination_lat: 4.72,
    destination_lng: -74.08,
    ...overrides,
  };
}

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    id: 'stop-1',
    sequence_order: 1,
    address: 'Calle 20',
    lat: 4.71,
    lng: -74.07,
    stop_type: 'PICKUP',
    status: 'PENDING',
    ...overrides,
  };
}

describe('serviceToMapPoints', () => {
  it('genera puntos de recogida y entrega con coordenadas válidas', () => {
    const points = serviceToMapPoints(makeService());

    expect(points).toEqual([
      {
        id: 's1-pickup',
        lat: 4.71,
        lng: -74.07,
        kind: 'pickup',
        label: 'Recogida: Calle 10',
      },
      {
        id: 's1-delivery',
        lat: 4.72,
        lng: -74.08,
        kind: 'delivery',
        label: 'Entrega: Carrera 15',
      },
    ]);
  });

  it('omite la recogida cuando faltan sus coordenadas', () => {
    const points = serviceToMapPoints(
      makeService({ origin_lat: null, origin_lng: null }),
    );

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe('delivery');
  });

  it('omite la entrega cuando faltan sus coordenadas', () => {
    const points = serviceToMapPoints(
      makeService({ destination_lat: undefined, destination_lng: undefined }),
    );

    expect(points).toHaveLength(1);
    expect(points[0].kind).toBe('pickup');
  });

  it('retorna una lista vacía cuando no hay coordenadas', () => {
    const points = serviceToMapPoints(
      makeService({
        origin_lat: null,
        origin_lng: null,
        destination_lat: null,
        destination_lng: null,
      }),
    );

    expect(points).toHaveLength(0);
  });

  it('descarta coordenadas no finitas', () => {
    const points = serviceToMapPoints(
      makeService({ origin_lat: NaN, destination_lng: Infinity }),
    );

    expect(points).toHaveLength(0);
  });

  it('acepta coordenadas serializadas como string (Decimal del backend)', () => {
    const points = serviceToMapPoints(
      makeService({
        origin_lat: '4.71' as unknown as number,
        origin_lng: '-74.07' as unknown as number,
        destination_lat: '4.72' as unknown as number,
        destination_lng: '-74.08' as unknown as number,
      }),
    );

    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ lat: 4.71, lng: -74.07, kind: 'pickup' });
    expect(points[1]).toMatchObject({ lat: 4.72, lng: -74.08, kind: 'delivery' });
  });

  it('descarta strings vacíos o no numéricos', () => {
    const points = serviceToMapPoints(
      makeService({
        origin_lat: '' as unknown as number,
        origin_lng: '   ' as unknown as number,
        destination_lat: 'abc' as unknown as number,
        destination_lng: '-74.08' as unknown as number,
      }),
    );

    expect(points).toHaveLength(0);
  });
});

describe('routeStopsToMapPoints', () => {
  it('mapea las paradas a puntos numerados con tipo y estado', () => {
    const points = routeStopsToMapPoints([
      makeStop(),
      makeStop({
        id: 'stop-2',
        sequence_order: 2,
        stop_type: 'DELIVERY',
        status: 'COMPLETED',
        address: 'Carrera 30',
        lat: 4.8,
        lng: -74.1,
      }),
    ]);

    expect(points).toEqual([
      {
        id: 'stop-1',
        lat: 4.71,
        lng: -74.07,
        kind: 'stop',
        label: 'Recogida #1: Calle 20',
        seq: 1,
        status: 'PENDING',
      },
      {
        id: 'stop-2',
        lat: 4.8,
        lng: -74.1,
        kind: 'stop',
        label: 'Entrega #2: Carrera 30',
        seq: 2,
        status: 'COMPLETED',
      },
    ]);
  });

  it('filtra paradas sin coordenadas válidas', () => {
    const points = routeStopsToMapPoints([
      makeStop(),
      makeStop({ id: 'stop-2', lat: null as unknown as number }),
      makeStop({ id: 'stop-3', lng: undefined as unknown as number }),
    ]);

    expect(points.map((p) => p.id)).toEqual(['stop-1']);
  });

  it('acepta coordenadas string en las paradas', () => {
    const points = routeStopsToMapPoints([
      makeStop({
        lat: '4.71' as unknown as number,
        lng: '-74.07' as unknown as number,
      }),
    ]);

    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ lat: 4.71, lng: -74.07, kind: 'stop' });
  });

  it('retorna una lista vacía si no recibe un arreglo', () => {
    expect(routeStopsToMapPoints(null as unknown as RouteStop[])).toEqual([]);
  });
});

describe('hasMapPoints', () => {
  it('es true cuando hay puntos', () => {
    expect(hasMapPoints(serviceToMapPoints(makeService()))).toBe(true);
  });

  it('es false cuando no hay puntos', () => {
    expect(hasMapPoints([])).toBe(false);
  });
});
