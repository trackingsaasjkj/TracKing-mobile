/**
 * Tests for useActiveRouteSummary hook.
 * Verifies route detection from services store and routes store.
 */

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

import * as fc from 'fast-check';
import { renderHook } from '@testing-library/react-native';
import { useActiveRouteSummary } from '@/features/dashboard/hooks/useActiveRouteSummary';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';
import type { Route, RouteStop } from '@/features/routes/types/routes.types';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeService(status: ServiceStatus, routeId?: string): Service {
  return {
    id: 'svc-1', status,
    origin_address: 'A', destination_address: 'B', destination_name: 'C',
    package_details: 'pkg', payment_status: 'UNPAID',
    is_settled_courier: false, is_settled_customer: false,
    total_price: 10000, delivery_price: 8000, product_price: 2000,
    routeStop: routeId
      ? { id: 'stop-1', route: { id: routeId, total_stops: 3 } }
      : null,
  };
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  const stops: RouteStop[] = [
    { id: 's1', sequence_order: 1, address: 'A', lat: 7.1, lng: -73.1, stop_type: 'PICKUP', status: 'COMPLETED' },
    { id: 's2', sequence_order: 2, address: 'B', lat: 7.2, lng: -73.2, stop_type: 'DELIVERY', status: 'COMPLETED' },
    { id: 's3', sequence_order: 3, address: 'C', lat: 7.3, lng: -73.3, stop_type: 'DELIVERY', status: 'PENDING' },
  ];
  return {
    id: 'route-1', company_id: 'co-1', route_type: 'DISTRIBUTION',
    status: 'IN_PROGRESS', total_stops: 3, estimated_distance: 4.2,
    estimated_time_minutes: 18, created_at: '2026-01-01T00:00:00Z',
    stops,
    ...overrides,
  };
}

// ─── Sin ruta activa ──────────────────────────────────────────────────────────

describe('useActiveRouteSummary — sin ruta activa', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: true });
    useRoutesStore.setState({ activeRoute: null, loaded: false });
  });

  it('retorna null cuando no hay servicios ni ruta en store', async () => {
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current).toBeNull();
  });

  it('retorna null cuando los servicios no tienen routeStop', async () => {
    useServicesStore.getState().setServices([makeService('ASSIGNED', undefined)]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current).toBeNull();
  });

  it('retorna null cuando los servicios con ruta están DELIVERED', async () => {
    useServicesStore.getState().setServices([makeService('DELIVERED', 'route-x')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current).toBeNull();
  });

  it('retorna null cuando los servicios con ruta están CANCELLED', async () => {
    useServicesStore.getState().setServices([makeService('CANCELLED', 'route-x')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current).toBeNull();
  });
});

// ─── Detecta ruta desde servicios ────────────────────────────────────────────

describe('useActiveRouteSummary — detecta ruta desde servicios', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: true });
    useRoutesStore.setState({ activeRoute: null, loaded: false });
  });

  it('detecta ruta cuando hay un servicio ASSIGNED con routeStop', async () => {
    useServicesStore.getState().setServices([makeService('ASSIGNED', 'route-abc')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.routeId).toBe('route-abc');
  });

  it('detecta ruta cuando hay un servicio ACCEPTED con routeStop', async () => {
    useServicesStore.getState().setServices([makeService('ACCEPTED', 'route-abc')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.routeId).toBe('route-abc');
  });

  it('detecta ruta cuando hay un servicio IN_TRANSIT con routeStop', async () => {
    useServicesStore.getState().setServices([makeService('IN_TRANSIT', 'route-abc')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.routeId).toBe('route-abc');
  });

  it('expone totalStops desde el routeStop del servicio', async () => {
    useServicesStore.getState().setServices([makeService('ASSIGNED', 'route-abc')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.totalStops).toBe(3);
  });

  it('completedStops es 0 cuando se deriva desde servicios (ruta no cargada aún)', async () => {
    useServicesStore.getState().setServices([makeService('ASSIGNED', 'route-abc')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.completedStops).toBe(0);
  });
});

// ─── Prioriza routesStore sobre servicios ─────────────────────────────────────

describe('useActiveRouteSummary — prioriza routesStore', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [], loaded: true });
    useRoutesStore.setState({ activeRoute: null, loaded: false });
  });

  it('usa routesStore cuando hay ruta cargada', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-from-store' }));
    useServicesStore.getState().setServices([makeService('ASSIGNED', 'route-from-services')]);
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.routeId).toBe('route-from-store');
  });

  it('calcula completedStops correctamente desde el store', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute()); // 2 COMPLETED, 1 PENDING
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.completedStops).toBe(2);
  });

  it('expone routeStatus del store', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ status: 'IN_PROGRESS' }));
    const { result } = await renderHook(() => useActiveRouteSummary());
    expect(result.current?.routeStatus).toBe('IN_PROGRESS');
  });
});

// ─── PBT: completedStops nunca supera totalStops ─────────────────────────────

describe('P-1: completedStops nunca supera totalStops (PBT)', () => {
  it('P-1: para cualquier combinación de paradas, completedStops ≤ totalStops', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 0, max: 8 }),
        async (total, completedCount) => {
          const actualCompleted = Math.min(completedCount, total);
          const stops: RouteStop[] = Array.from({ length: total }, (_, i) => ({
            id: `s${i}`, sequence_order: i + 1, address: 'Dir',
            lat: 7.1, lng: -73.1, stop_type: 'DELIVERY' as const,
            status: i < actualCompleted ? 'COMPLETED' as const : 'PENDING' as const,
          }));

          useRoutesStore.setState({ activeRoute: null, loaded: false });
          useRoutesStore.getState().setActiveRoute({
            id: 'r1', company_id: 'co-1', route_type: 'DISTRIBUTION',
            status: 'IN_PROGRESS', total_stops: total,
            estimated_distance: 1, estimated_time_minutes: 5,
            created_at: '2026-01-01T00:00:00Z', stops,
          });

          const { result } = await renderHook(() => useActiveRouteSummary());
          const summary = result.current;
          expect(summary).not.toBeNull();
          expect(summary!.completedStops).toBeLessThanOrEqual(summary!.totalStops);
        },
      ),
      { numRuns: 100 },
    );
  });
});
