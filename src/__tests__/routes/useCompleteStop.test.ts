/**
 * Tests for useCompleteStop hook.
 * Verifies GPS + evidence data flow and cache invalidation.
 */

jest.mock('@/features/routes/api/routesApi', () => ({
  routesApi: {
    getRoute: jest.fn(),
    completeStop: jest.fn(),
  },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useCompleteStop } from '@/features/routes/hooks/useCompleteStop';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { routesApi } from '@/features/routes/api/routesApi';
import type { Route, RouteStop } from '@/features/routes/types/routes.types';
import type { StopCompletionData } from '@/features/routes/components/CompleteStopModal';

// ─── Factories ────────────────────────────────────────────────────────────────

function makeStop(id: string): RouteStop {
  return {
    id,
    sequence_order: 1,
    address: 'Cra 27 #45-10',
    lat: 7.119,
    lng: -73.122,
    stop_type: 'DELIVERY',
    status: 'PENDING',
  };
}

function makeRoute(stops: RouteStop[]): Route {
  return {
    id: 'route-1',
    company_id: 'co-1',
    route_type: 'DISTRIBUTION',
    status: 'IN_PROGRESS',
    total_stops: stops.length,
    estimated_distance: 4.2,
    estimated_time_minutes: 18,
    created_at: '2026-01-01T00:00:00Z',
    stops,
  };
}

function makePayload(overrides: Partial<StopCompletionData> = {}): StopCompletionData {
  return {
    latitude: 7.119349,
    longitude: -73.122742,
    photo_url: undefined,
    notes: undefined,
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

// ─── execute — éxito ──────────────────────────────────────────────────────────

describe('useCompleteStop — execute exitoso', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: makeRoute([makeStop('s1'), makeStop('s2')]), loaded: true });
    jest.clearAllMocks();
  });

  it('llama a routesApi.completeStop con los datos correctos', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    expect(routesApi.completeStop).toHaveBeenCalledWith('route-1', 's1', {
      latitude: 7.119349,
      longitude: -73.122742,
      photo_url: undefined,
      notes: undefined,
    });
  });

  it('retorna ok:true en éxito', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    let res: any;
    await act(async () => {
      res = await result.current.execute('route-1', 's1', makePayload());
    });

    expect(res.ok).toBe(true);
  });

  it('actualiza la parada en el store a COMPLETED', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 's1');
    expect(stop?.status).toBe('COMPLETED');
  });

  it('no modifica otras paradas en el store', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    const stop2 = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 's2');
    expect(stop2?.status).toBe('PENDING');
  });

  it('envía photo_url cuando se incluye', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload({ photo_url: 'file:///photo.jpg' }));
    });

    expect(routesApi.completeStop).toHaveBeenCalledWith(
      'route-1', 's1',
      expect.objectContaining({ photo_url: 'file:///photo.jpg' }),
    );
  });
});

// ─── execute — error ──────────────────────────────────────────────────────────

describe('useCompleteStop — execute con error', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: makeRoute([makeStop('s1')]), loaded: true });
    jest.clearAllMocks();
  });

  it('retorna ok:false con userMessage del error', async () => {
    (routesApi.completeStop as jest.Mock).mockRejectedValue({ userMessage: 'Parada ya completada' });
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    let res: any;
    await act(async () => {
      res = await result.current.execute('route-1', 's1', makePayload());
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Parada ya completada');
  });

  it('retorna mensaje genérico cuando no hay userMessage', async () => {
    (routesApi.completeStop as jest.Mock).mockRejectedValue(new Error('500'));
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    let res: any;
    await act(async () => {
      res = await result.current.execute('route-1', 's1', makePayload());
    });

    expect(res.ok).toBe(false);
    expect(res.error).toBe('Error al completar parada');
  });

  it('no actualiza el store en caso de error', async () => {
    (routesApi.completeStop as jest.Mock).mockRejectedValue({ userMessage: 'Error' });
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    const stop = useRoutesStore.getState().activeRoute?.stops.find((s) => s.id === 's1');
    expect(stop?.status).toBe('PENDING');
  });

  it('loading queda en null tras el error', async () => {
    (routesApi.completeStop as jest.Mock).mockRejectedValue({ userMessage: 'Error' });
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    expect(result.current.loading).toBeNull();
  });
});

// ─── loading state ────────────────────────────────────────────────────────────

describe('useCompleteStop — loading state', () => {
  beforeEach(() => {
    useRoutesStore.setState({ activeRoute: makeRoute([makeStop('s1')]), loaded: true });
    jest.clearAllMocks();
  });

  it('loading es null al inicio', async () => {
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });
    expect(result.current.loading).toBeNull();
  });

  it('loading se limpia a null tras el éxito', async () => {
    (routesApi.completeStop as jest.Mock).mockResolvedValue(undefined);
    const { result } = await renderHook(() => useCompleteStop(), { wrapper });

    await act(async () => {
      await result.current.execute('route-1', 's1', makePayload());
    });

    expect(result.current.loading).toBeNull();
  });
});
