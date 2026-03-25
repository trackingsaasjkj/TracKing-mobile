import { renderHook, act } from '@testing-library/react-native';
import { useLocation } from '@/features/tracking/hooks/useLocation';
import * as ExpoLocation from 'expo-location';
import { locationApi } from '@/features/tracking/api/locationApi';

jest.mock('expo-location');
jest.mock('@/features/tracking/api/locationApi');

const mockCoords = { latitude: 4.71, longitude: -74.07, accuracy: 10 };

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();

  (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
    coords: mockCoords,
  });
  (locationApi.send as jest.Mock).mockResolvedValue(undefined);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useLocation', () => {
  it('does not send location when inactive', async () => {
    renderHook(() => useLocation({ active: false }));
    await act(async () => { jest.runAllTimers(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('sends location immediately when activated', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledWith(mockCoords);
  });

  it('sends location with correct payload', async () => {
    renderHook(() => useLocation({ active: true }));
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).toHaveBeenCalledWith({
      latitude: 4.71,
      longitude: -74.07,
      accuracy: 10,
    });
  });

  it('does not throw when permission is denied', async () => {
    (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    expect(() => renderHook(() => useLocation({ active: true }))).not.toThrow();
    await act(async () => { await Promise.resolve(); });
    expect(locationApi.send).not.toHaveBeenCalled();
  });

  it('silently swallows API errors', async () => {
    (locationApi.send as jest.Mock).mockRejectedValue(new Error('Network error'));
    expect(() => renderHook(() => useLocation({ active: true }))).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });

  it('stops sending when deactivated', async () => {
    const { rerender } = renderHook<void, { active: boolean }>(
      ({ active }) => useLocation({ active }),
      { initialProps: { active: true } }
    );
    await act(async () => { await Promise.resolve(); });
    const callsBefore = (locationApi.send as jest.Mock).mock.calls.length;

    rerender({ active: false });
    await act(async () => { jest.advanceTimersByTime(30_000); });

    expect((locationApi.send as jest.Mock).mock.calls.length).toBe(callsBefore);
  });
});
