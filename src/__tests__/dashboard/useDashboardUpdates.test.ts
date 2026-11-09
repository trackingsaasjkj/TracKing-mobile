/**
 * Tests for useDashboardUpdates hook.
 * Verifies that onRefresh is called when service:assigned arrives via WebSocket.
 */

// ─── wsClient mock ────────────────────────────────────────────────────────────
// Variable must be prefixed with "mock" to be accessible inside jest.mock factory
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
import { useDashboardUpdates } from '@/features/dashboard/hooks/useDashboardUpdates';
import { useAuthStore } from '@/features/auth/store/authStore';
import { wsClient } from '@/core/api/wsClient';

function emitWs(event: string, ...args: unknown[]) {
  mockWsListeners.get(event)?.forEach((h) => h(...args));
}

describe('useDashboardUpdates', () => {
  beforeEach(() => {
    mockWsListeners.clear();
    jest.clearAllMocks();
    useAuthStore.setState({ accessToken: 'test-token', isAuthenticated: true, user: null });
  });

  it('registers listener for service:assigned on mount', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useDashboardUpdates(onRefresh));
    expect(wsClient.on).toHaveBeenCalledWith('service:assigned', expect.any(Function));
  });

  it('calls onRefresh when service:assigned event fires', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useDashboardUpdates(onRefresh));

    await act(async () => {
      emitWs('service:assigned', { id: 'svc-new', status: 'ASSIGNED' });
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not register listener when accessToken is null', async () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: null });
    const onRefresh = jest.fn();
    await renderHook(() => useDashboardUpdates(onRefresh));
    expect(wsClient.on).not.toHaveBeenCalled();
  });

  it('does not call onRefresh for service:updated events', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useDashboardUpdates(onRefresh));

    await act(async () => {
      emitWs('service:updated', { id: 'svc-1', status: 'ACCEPTED' });
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('calls onRefresh multiple times for multiple service:assigned events', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useDashboardUpdates(onRefresh));

    await act(async () => {
      emitWs('service:assigned', { id: 'svc-1' });
      emitWs('service:assigned', { id: 'svc-2' });
      emitWs('service:assigned', { id: 'svc-3' });
    });

    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('unsubscribes listener on unmount', async () => {
    const onRefresh = jest.fn();
    const { unmount } = await renderHook(() => useDashboardUpdates(onRefresh));

    await unmount();

    await act(async () => {
      emitWs('service:assigned', { id: 'svc-1' });
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('re-registers listener when accessToken changes', async () => {
    const onRefresh = jest.fn();
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: null });

    const { rerender } = await renderHook(() => useDashboardUpdates(onRefresh));
    expect(wsClient.on).not.toHaveBeenCalled();

    await act(async () => {
      useAuthStore.setState({ accessToken: 'new-token', isAuthenticated: true, user: null });
    });
    await rerender({});

    expect(wsClient.on).toHaveBeenCalledWith('service:assigned', expect.any(Function));
  });
});
