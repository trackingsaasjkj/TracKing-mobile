/**
 * Tests for useRoutesStore — state management for the active route.
 */

import * as fc from 'fast-check';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import type { Route, RouteStop, RouteStatus, RouteStopStatus } from '@/features/routes/types/routes.types';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    id: 'stop-1',
    sequence_order: 1,
    address: 'Cra 27 #45-10',
    lat: 7.119,
    lng: -73.122,
    stop_type: 'DELIVERY',
    status: 'PENDING',
    ...overrides,
  };
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'route-1',
    company_id: 'co-1',
    route_type: 'DISTRIBUTION',
    status: 'IN_PROGRESS',
    total_stops: 2,
    estimated_distance: 4.2,
    estimated_time_minutes: 18,
    created_at: '2026-01-01T00:00:00Z',
    stops: [makeStop({ id: 'stop-1' }), makeStop({ id: 'stop-2', sequence_order: 2 })],
    ...overrides,
  };
}

// ─── setActiveRoute ───────────────────────────────────────────────────────────

describe('routesStore — setActiveRoute', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: null, loaded: false });
  });

  it('establece la ruta activa y loaded=true', async () => {
    const route = makeRoute();
    useRoutesStore.getState().setActiveRoute(route);
    expect(useRoutesStore.getState().activeRoute).toEqual(route);
    expect(useRoutesStore.getState().loaded).toBe(true);
  });

  it('permite sobreescribir la ruta activa', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'r1' }));
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'r2' }));
    expect(useRoutesStore.getState().activeRoute?.id).toBe('r2');
  });

  it('acepta null para limpiar la ruta', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    useRoutesStore.getState().setActiveRoute(null);
    expect(useRoutesStore.getState().activeRoute).toBeNull();
    expect(useRoutesStore.getState().loaded).toBe(true);
  });
});

// ─── clearActiveRoute ─────────────────────────────────────────────────────────

describe('routesStore — clearActiveRoute', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: makeRoute(), loaded: true });
  });

  it('limpia la ruta y resetea loaded', async () => {
    useRoutesStore.getState().clearActiveRoute();
    expect(useRoutesStore.getState().activeRoute).toBeNull();
    expect(useRoutesStore.getState().loaded).toBe(false);
  });
});

// ─── updateStop ───────────────────────────────────────────────────────────────

describe('routesStore — updateStop', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: null, loaded: false });
  });

  it('actualiza el estado de la parada correcta', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    useRoutesStore.getState().updateStop('stop-1', { status: 'COMPLETED' });
    const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 'stop-1');
    expect(stop?.status).toBe('COMPLETED');
  });

  it('no modifica otras paradas', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    useRoutesStore.getState().updateStop('stop-1', { status: 'COMPLETED' });
    const stop2 = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 'stop-2');
    expect(stop2?.status).toBe('PENDING');
  });

  it('actualiza completion_time junto con status', async () => {
    const time = '2026-01-01T08:00:00Z';
    useRoutesStore.getState().setActiveRoute(makeRoute());
    useRoutesStore.getState().updateStop('stop-1', { status: 'COMPLETED', completion_time: time });
    const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 'stop-1');
    expect(stop?.completion_time).toBe(time);
  });

  it('no lanza error si no hay ruta activa', async () => {
    expect(() => {
      useRoutesStore.getState().updateStop('stop-1', { status: 'COMPLETED' });
    }).not.toThrow();
  });

  it('ignora stopId desconocido sin modificar otras paradas', async () => {
    useRoutesStore.getState().setActiveRoute(makeRoute());
    useRoutesStore.getState().updateStop('unknown-stop', { status: 'COMPLETED' });
    const stops = useRoutesStore.getState().activeRoute?.stops ?? [];
    expect(stops.every((s) => s.status === 'PENDING')).toBe(true);
  });
});

// ─── PBT: updateStop es idempotente ──────────────────────────────────────────

describe('P-1: updateStop es idempotente (PBT)', () => {
  it('P-1: aplicar el mismo update dos veces produce el mismo resultado', async () => {
    fc.assert(
      fc.property(
        fc.constantFrom<RouteStopStatus>('PENDING', 'COMPLETED'),
        (status) => {
          useRoutesStore.setState({ activeRoute: null, loaded: false });
          useRoutesStore.getState().setActiveRoute(makeRoute());
          const updates = { status };
          useRoutesStore.getState().updateStop('stop-1', updates);
          useRoutesStore.getState().updateStop('stop-1', updates);
          const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 'stop-1');
          expect(stop?.status).toBe(status);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: setActiveRoute preserva paradas ────────────────────────────────────

describe('P-2: setActiveRoute preserva el número de paradas (PBT)', () => {
  it('P-2: la ruta almacenada tiene exactamente las paradas que se pasaron', async () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }),
        (numStops) => {
          useRoutesStore.setState({ activeRoute: null, loaded: false });
          const stops = Array.from({ length: numStops }, (_, i) =>
            makeStop({ id: `stop-${i}`, sequence_order: i + 1 }),
          );
          useRoutesStore.getState().setActiveRoute(makeRoute({ stops, total_stops: numStops }));
          expect(useRoutesStore.getState().activeRoute?.stops).toHaveLength(numStops);
        },
      ),
      { numRuns: 50 },
    );
  });
});
