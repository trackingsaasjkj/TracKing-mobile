/**
 * Tests for useEarningsUpdates hook.
 * Verifies that courier-earnings cache is invalidated when settlement:created fires.
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

import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEarningsUpdates } from '@/features/earnings/hooks/useEarningsUpdates';
import { useAuthStore } from '@/features/auth/store/authStore';
import { wsClient } from '@/core/api/wsClient';

function emitWs(event: string, ...args: unknown[]) {
  mockWsListeners.get(event)?.forEach((h) => h(...args));
}

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

describe('useEarningsUpdates', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    mockWsListeners.clear();
    jest.clearAllMocks();
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    useAuthStore.setState({ accessToken: 'test-token', isAuthenticated: true, user: null });
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('registers listener for settlement:created on mount', () => {
    renderHook(() => useEarningsUpdates(), { wrapper: makeWrapper(queryClient) });
    expect(wsClient.on).toHaveBeenCalledWith('settlement:created', expect.any(Function));
  });

  it('invalidates courier-earnings query when settlement:created fires', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useEarningsUpdates(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      emitWs('settlement:created', { id: 'liq-1', total_earned: 50000 });
    });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['courier-earnings'] });
  });

  it('does not register listener when accessToken is null', () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false, user: null });
    renderHook(() => useEarningsUpdates(), { wrapper: makeWrapper(queryClient) });
    expect(wsClient.on).not.toHaveBeenCalled();
  });

  it('does not invalidate for unrelated events', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useEarningsUpdates(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      emitWs('service:updated', { id: 'svc-1' });
      emitWs('service:assigned', { id: 'svc-2' });
    });

    expect(invalidate).not.toHaveBeenCalled();
  });

  it('invalidates multiple times for multiple settlement:created events', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    renderHook(() => useEarningsUpdates(), { wrapper: makeWrapper(queryClient) });

    await act(async () => {
      emitWs('settlement:created', { id: 'liq-1' });
      emitWs('settlement:created', { id: 'liq-2' });
    });

    expect(invalidate).toHaveBeenCalledTimes(2);
    expect(invalidate).toHaveBeenNthCalledWith(1, { queryKey: ['courier-earnings'] });
    expect(invalidate).toHaveBeenNthCalledWith(2, { queryKey: ['courier-earnings'] });
  });

  it('unsubscribes listener on unmount', async () => {
    const invalidate = jest.spyOn(queryClient, 'invalidateQueries');

    const { unmount } = renderHook(() => useEarningsUpdates(), {
      wrapper: makeWrapper(queryClient),
    });

    unmount();

    await act(async () => {
      emitWs('settlement:created', { id: 'liq-1' });
    });

    expect(invalidate).not.toHaveBeenCalled();
  });
});
