/**
 * Tests for useRouteUpdates hook.
 *
 * The hook is intentionally a no-op: route WebSocket events are handled by
 * useServiceUpdates, which stays mounted for the whole session. These tests
 * pin that contract so the hook is not accidentally reimplemented with a
 * second set of listeners.
 */

jest.mock('@/core/api/wsClient', () => ({
  wsClient: {
    on: jest.fn(),
  },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

import { renderHook } from '@testing-library/react-native';
import { useRouteUpdates } from '@/features/routes/hooks/useRouteUpdates';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { wsClient } from '@/core/api/wsClient';

beforeEach(() => {
  jest.clearAllMocks();
  useRoutesStore.setState({ activeRoute: null, loaded: false });
  useAuthStore.setState({ accessToken: 'test-token', isAuthenticated: true, user: null });
});

describe('useRouteUpdates — no-op de compatibilidad', () => {
  it('renderiza sin lanzar', async () => {
    await expect(renderHook(() => useRouteUpdates('route-1'))).resolves.toBeDefined();
  });

  it('no registra listeners de WebSocket', async () => {
    await renderHook(() => useRouteUpdates('route-1'));

    expect(wsClient.on).not.toHaveBeenCalled();
  });

  it('no modifica el store de rutas (lo hace useServiceUpdates)', async () => {
    await renderHook(() => useRouteUpdates('route-1'));

    expect(useRoutesStore.getState().activeRoute).toBeNull();
    expect(useRoutesStore.getState().loaded).toBe(false);
  });
});
