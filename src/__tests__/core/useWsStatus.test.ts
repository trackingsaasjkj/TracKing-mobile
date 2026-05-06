/**
 * Tests for useWsStatus hook.
 * Verifies that the hook reflects wsClient status changes reactively.
 */

// ─── wsClient mock ────────────────────────────────────────────────────────────
// Variables must be prefixed with "mock" to be accessible inside jest.mock factory
let mockCurrentStatus = 'disconnected';
const mockStatusListeners = new Set<(s: string) => void>();

jest.mock('@/core/api/wsClient', () => ({
  wsClient: {
    get status() { return mockCurrentStatus; },
    onStatusChange: jest.fn((handler: (s: string) => void) => {
      mockStatusListeners.add(handler);
      return () => mockStatusListeners.delete(handler);
    }),
  },
}));

import { renderHook, act } from '@testing-library/react-native';
import { useWsStatus } from '@/core/hooks/useWsStatus';

function emitStatus(status: string) {
  mockCurrentStatus = status;
  mockStatusListeners.forEach((h) => h(status));
}

describe('useWsStatus', () => {
  beforeEach(() => {
    mockCurrentStatus = 'disconnected';
    mockStatusListeners.clear();
    jest.clearAllMocks();
  });

  it('returns initial status from wsClient.status', () => {
    mockCurrentStatus = 'disconnected';
    const { result } = renderHook(() => useWsStatus());
    expect(result.current).toBe('disconnected');
  });

  it('updates to connected when wsClient emits connected', () => {
    const { result } = renderHook(() => useWsStatus());

    act(() => {
      emitStatus('connected');
    });

    expect(result.current).toBe('connected');
  });

  it('updates to reconnecting when wsClient emits reconnecting', () => {
    const { result } = renderHook(() => useWsStatus());

    act(() => {
      emitStatus('reconnecting');
    });

    expect(result.current).toBe('reconnecting');
  });

  it('updates to disconnected when wsClient emits disconnected after being connected', () => {
    mockCurrentStatus = 'connected';
    const { result } = renderHook(() => useWsStatus());

    act(() => {
      emitStatus('disconnected');
    });

    expect(result.current).toBe('disconnected');
  });

  it('reflects multiple sequential status changes', () => {
    const { result } = renderHook(() => useWsStatus());

    act(() => { emitStatus('reconnecting'); });
    expect(result.current).toBe('reconnecting');

    act(() => { emitStatus('connected'); });
    expect(result.current).toBe('connected');

    act(() => { emitStatus('disconnected'); });
    expect(result.current).toBe('disconnected');
  });

  it('unsubscribes from wsClient on unmount', () => {
    const { result, unmount } = renderHook(() => useWsStatus());

    unmount();

    // After unmount, emitting should not update the frozen hook state
    act(() => {
      emitStatus('connected');
    });

    expect(result.current).toBe('disconnected');
  });

  it('calls onStatusChange exactly once on mount', () => {
    const { wsClient } = require('@/core/api/wsClient');
    renderHook(() => useWsStatus());
    expect(wsClient.onStatusChange).toHaveBeenCalledTimes(1);
  });
});
