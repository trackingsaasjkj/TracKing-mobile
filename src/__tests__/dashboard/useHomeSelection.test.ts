import { act, renderHook } from '@testing-library/react-native';
import { useHomeSelection } from '@/features/dashboard/hooks/useHomeSelection';
import { routesApi } from '@/features/routes/api/routesApi';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import type { Route, RouteStop } from '@/features/routes/types/routes.types';
import type { Service } from '@/features/services/types/services.types';

jest.mock('@/features/routes/api/routesApi', () => ({
  routesApi: { getRoute: jest.fn() },
}));

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

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'r1',
    company_id: 'c1',
    route_type: 'DISTRIBUTION',
    status: 'IN_PROGRESS',
    total_stops: 2,
    estimated_distance: 10,
    estimated_time_minutes: 30,
    created_at: '2026-01-01T00:00:00Z',
    stops: [
      makeStop(),
      makeStop({ id: 'stop-2', sequence_order: 2, stop_type: 'DELIVERY' }),
    ],
    ...overrides,
  };
}

const activeRoute = { routeId: 'r1', totalStops: 2 };

beforeEach(() => {
  jest.clearAllMocks();
  useRoutesStore.getState().clearActiveRoute();
});

describe('useHomeSelection — servicios', () => {
  it('selecciona un servicio y expone sus puntos en el mapa', async () => {
    const service = makeService();
    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [service], activeRoute: null }),
    );

    await act(async () => {
      result.current.selectService(service.id);
    });

    expect(result.current.selectedId).toBe('service:s1');
    expect(result.current.selectedService?.id).toBe('s1');
    expect(result.current.mapPoints.map((p) => p.kind)).toEqual([
      'pickup',
      'delivery',
    ]);
  });

  it('volver a tocar el mismo servicio limpia la selección', async () => {
    const service = makeService();
    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [service], activeRoute: null }),
    );

    await act(async () => {
      result.current.selectService(service.id);
    });
    await act(async () => {
      result.current.selectService(service.id);
    });

    expect(result.current.selectedId).toBeNull();
    expect(result.current.mapPoints).toEqual([]);
  });

  it('limpia la selección si el servicio deja de estar activo', async () => {
    const service = makeService();
    const { result, rerender } = await renderHook(
      ({ activeServices }: { activeServices: Service[] }) =>
        useHomeSelection({ activeServices, activeRoute: null }),
      { initialProps: { activeServices: [service] } },
    );

    await act(async () => {
      result.current.selectService(service.id);
    });
    expect(result.current.selectedId).toBe('service:s1');

    await rerender({ activeServices: [] });

    expect(result.current.selectedId).toBeNull();
    expect(result.current.mapPoints).toEqual([]);
  });

  it('clearSelection la limpia e incrementa recenterToken', async () => {
    const service = makeService();
    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [service], activeRoute: null }),
    );

    const tokenBefore = result.current.recenterToken;
    await act(async () => {
      result.current.selectService(service.id);
    });
    await act(async () => {
      result.current.clearSelection();
    });

    expect(result.current.selectedId).toBeNull();
    expect(result.current.recenterToken).toBe(tokenBefore + 1);
  });
});

describe('useHomeSelection — rutas', () => {
  it('carga las paradas con getRoute cuando no están en el store', async () => {
    const route = makeRoute();
    (routesApi.getRoute as jest.Mock).mockResolvedValue(route);

    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [], activeRoute }),
    );

    await act(async () => {
      await result.current.selectRoute('r1');
    });

    expect(routesApi.getRoute).toHaveBeenCalledWith('r1');
    expect(useRoutesStore.getState().activeRoute?.id).toBe('r1');
    expect(result.current.selectedRouteId).toBe('r1');
    expect(result.current.mapPoints).toHaveLength(2);
  });

  it('no vuelve a pedir la ruta si ya está en el store con paradas', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [], activeRoute }),
    );

    await act(async () => {
      await result.current.selectRoute('r1');
    });

    expect(routesApi.getRoute).not.toHaveBeenCalled();
    expect(result.current.mapPoints).toHaveLength(2);
  });

  it('cae a las coordenadas del servicio asociado si la ruta no tiene paradas', async () => {
    const service = makeService({
      routeStop: { id: 'stop-1', route: { id: 'r1', total_stops: 2 } },
    });
    const { result } = await renderHook(() =>
      useHomeSelection({ activeServices: [service], activeRoute }),
    );

    (routesApi.getRoute as jest.Mock).mockResolvedValue(makeRoute({ stops: [] }));

    await act(async () => {
      await result.current.selectRoute('r1');
    });

    expect(result.current.mapPoints.map((p) => p.kind)).toEqual([
      'pickup',
      'delivery',
    ]);
  });

  it('limpia la selección si la ruta activa cambia', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    const { result, rerender } = await renderHook(
      ({ route }: { route: { routeId: string; totalStops: number } | null }) =>
        useHomeSelection({ activeServices: [], activeRoute: route }),
      { initialProps: { route: activeRoute } },
    );

    await act(async () => {
      await result.current.selectRoute('r1');
    });
    expect(result.current.selectedId).toBe('route:r1');

    await rerender({ route: null });

    expect(result.current.selectedId).toBeNull();
  });
});
