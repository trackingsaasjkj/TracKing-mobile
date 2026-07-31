/**
 * Tests for useRouteUpdates hook.
 * Verifies real-time WebSocket event handling for route lifecycle.
 */

// ─── wsClient mock ────────────────────────────────────────────────────────────
const mockWsListeners = new Map<string, Set<(...args: unknown[]) => void>>();

jest.mock('@/core/api/wsClient', () => ({
  wsClient: {
    on: jest.fn((event: string, handler: (...args: unknown[]) => void) => {
      if (!mockWsListeners.has(event)) mockWsListeners.set(event, new Set());
      mockWsListeners.get(event)!.add(handler);
      return () => mockWsListeners.get(event)?.delete(handler);
    }),
  },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRouteUpdates } from '@/features/routes/hooks/useRouteUpdates';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { wsClient } from '@/core/api/wsClient';
import type { Route, RouteStop } from '@/features/routes/types/routes.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emitWs(event: string, payload: unknown) {
  mockWsListeners.get(event)?.forEach((h) => h(payload));
}

function makeStop(id: string, status: RouteStop['status'] = 'PENDING'): RouteStop {
  return {
    id, sequence_order: 1, address: 'Dir', lat: 7.1, lng: -73.1,
    stop_type: 'DELIVERY', status,
  };
}

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 'route-1', company_id: 'co-1', route_type: 'DISTRIBUTION',
    status: 'IN_PROGRESS', total_stops: 2, estimated_distance: 4.2,
    estimated_time_minutes: 18, created_at: '2026-01-01T00:00:00Z',
    stops: [makeStop('s1'), makeStop('s2')],
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockWsListeners.clear();
  jest.clearAllMocks();
  useRoutesStore.setState({ activeRoute: null, loaded: false });
  useAuthStore.setState({ accessToken: 'test-token', isAuthenticated: true, user: null });
});

// ─── Registro de listeners ────────────────────────────────────────────────────

describe('useRouteUpdates — registro de listeners', () => {
  it('registra los 3 eventos de ruta al montar', () => {
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    expect(wsClient.on).toHaveBeenCalledWith('route:assigned', expect.any(Function));
    expect(wsClient.on).toHaveBeenCalledWith('route:updated', expect.any(Function));
    expect(wsClient.on).toHaveBeenCalledWith('route:stop:completed', expect.any(Function));
  });

  it('no registra listeners sin accessToken', () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: null });
    renderHook(() => useRouteUpdates('route-1'), { wrapper });
    expect(wsClient.on).not.toHaveBeenCalled();
  });

  it('cancela los listeners al desmontar', () => {
    const { unmount } = renderHook(() => useRouteUpdates('route-1'), { wrapper });
    unmount();

    // Emit after unmount — store should not change
    useRoutesStore.getState().setActiveRoute(makeRoute());
    act(() => {
      emitWs('route:updated', { id: 'route-1', status: 'CANCELLED' });
    });
    expect(useRoutesStore.getState().activeRoute?.status).toBe('IN_PROGRESS');
  });
});

// ─── route:assigned ───────────────────────────────────────────────────────────

describe('useRouteUpdates — route:assigned', () => {
  it('guarda la ruta en el store cuando se recibe route:assigned', () => {
    renderHook(() => useRouteUpdates(), { wrapper });
    const route = makeRoute({ id: 'route-new' });

    act(() => { emitWs('route:assigned', route); });

    expect(useRoutesStore.getState().activeRoute?.id).toBe('route-new');
    expect(useRoutesStore.getState().loaded).toBe(true);
  });

  it('incluye las paradas de la ruta asignada', () => {
    renderHook(() => useRouteUpdates(), { wrapper });
    const route = makeRoute({ stops: [makeStop('s1'), makeStop('s2'), makeStop('s3')] });

    act(() => { emitWs('route:assigned', route); });

    expect(useRoutesStore.getState().activeRoute?.stops).toHaveLength(3);
  });
});

// ─── route:updated ────────────────────────────────────────────────────────────

describe('useRouteUpdates — route:updated', () => {
  it('actualiza el status de la ruta activa a COMPLETED', () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-1' }));
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    act(() => { emitWs('route:updated', { id: 'route-1', status: 'COMPLETED' }); });

    expect(useRoutesStore.getState().activeRoute?.status).toBe('COMPLETED');
  });

  it('actualiza el status de la ruta activa a CANCELLED', () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-1' }));
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    act(() => { emitWs('route:updated', { id: 'route-1', status: 'CANCELLED' }); });

    expect(useRoutesStore.getState().activeRoute?.status).toBe('CANCELLED');
  });

  it('no modifica el store si el id no coincide', () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-1' }));
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    act(() => { emitWs('route:updated', { id: 'route-OTHER', status: 'CANCELLED' }); });

    expect(useRoutesStore.getState().activeRoute?.status).toBe('IN_PROGRESS');
  });
});

// ─── route:stop:completed ─────────────────────────────────────────────────────

describe('useRouteUpdates — route:stop:completed', () => {
  it('marca la parada como COMPLETED en el store', () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-1' }));
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    act(() => {
      emitWs('route:stop:completed', {
        route_id: 'route-1',
        stop_id: 's1',
        route_status: 'IN_PROGRESS',
      });
    });

    const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 's1');
    expect(stop?.status).toBe('COMPLETED');
  });

  it('no modifica otras paradas al completar una', () => {
    useRoutesStore.getState().setActiveRoute(makeRoute({ id: 'route-1' }));
    renderHook(() => useRouteUpdates('route-1'), { wrapper });

    act(() => {
      emitWs('route:stop:completed', {
        route_id: 'route-1',
        stop_id: 's1',
        route_status: 'IN_PROGRESS',
      });
    });

    const stop2 = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 's2');
    expect(stop2?.status).toBe('PENDING');
  });
});
