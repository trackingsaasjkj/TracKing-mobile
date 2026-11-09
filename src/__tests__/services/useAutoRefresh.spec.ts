import { renderHook, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useAutoRefresh } from '@/core/hooks/useAutoRefresh';

// Mock AppState
const mockAddEventListener = jest.fn();
const mockRemove = jest.fn();

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calls onRefresh after the foreground interval', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 45_000 }));

    expect(onRefresh).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(45_000); });
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('calls onRefresh multiple times over multiple intervals', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 10_000 }));

    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(onRefresh).toHaveBeenCalledTimes(3);
  });

  it('calls onRefresh immediately when app returns to foreground', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 45_000 }));

    // Simulate app going to background then returning to active
    const appStateHandler = (AppState.addEventListener as jest.Mock).mock.calls[0][1];

    await act(async () => { appStateHandler('background'); });
    await act(async () => { appStateHandler('active'); });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not call onRefresh when going from active to background', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 45_000 }));

    const appStateHandler = (AppState.addEventListener as jest.Mock).mock.calls[0][1];
    await act(async () => { appStateHandler('background'); });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it('clears interval and removes AppState listener on unmount', async () => {
    const onRefresh = jest.fn();
    const { unmount } = await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 45_000 }));

    await unmount();

    await act(async () => { jest.advanceTimersByTime(90_000); });
    expect(onRefresh).not.toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });

  it('does not start polling when enabled is false', async () => {
    const onRefresh = jest.fn();
    await renderHook(() => useAutoRefresh(onRefresh, { foregroundInterval: 45_000, enabled: false }));

    await act(async () => { jest.advanceTimersByTime(90_000); });
    expect(onRefresh).not.toHaveBeenCalled();
  });
});
