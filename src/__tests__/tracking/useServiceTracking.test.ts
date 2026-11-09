import { renderHook, act, cleanup, waitFor } from '@testing-library/react-native';
import { AppState } from 'react-native';
import * as ExpoLocation from 'expo-location';
import { useServiceTracking } from '@/features/tracking/hooks/useServiceTracking';
import { useAuthStore } from '@/features/auth/store/authStore';
import { secureStorage } from '@/core/storage/secureStorage';
import { WORKDAY_BACKGROUND_TASK } from '@/features/tracking/tasks/workdayBackgroundTask';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(),
  },
  Platform: { OS: 'android' },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    getAccessToken: jest.fn(() => Promise.resolve(null)),
  },
}));

const appStateListeners: Array<(state: string) => void> = [];

function makeUser(operationalStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'IN_SERVICE') {
  return {
    id: 'u1',
    name: 'Test',
    email: 't@t.com',
    role: 'COURIER' as const,
    company_id: 'c1',
    operationalStatus,
  };
}

function setSession(
  operationalStatus: 'AVAILABLE' | 'UNAVAILABLE' | 'IN_SERVICE',
  overrides: { accessToken?: string | null; isAuthenticated?: boolean; user?: boolean } = {},
) {
  useAuthStore.setState({
    user: overrides.user === false ? null : makeUser(operationalStatus),
    accessToken: overrides.accessToken === undefined ? 'tok' : overrides.accessToken,
    isAuthenticated: overrides.isAuthenticated ?? true,
  });
}

function setRunning(running: boolean) {
  (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(running);
}

beforeEach(() => {
  jest.clearAllMocks();
  appStateListeners.length = 0;
  (AppState.addEventListener as jest.Mock).mockImplementation((_event, handler) => {
    appStateListeners.push(handler);
    return { remove: jest.fn() };
  });
  (ExpoLocation.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
  (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
  (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (ExpoLocation.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (secureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
  setSession('AVAILABLE');
});

afterEach(async () => {
  await cleanup();
});

describe('useServiceTracking — watchdog de jornada', () => {
  it('inicia el tracking cuando la jornada está AVAILABLE y el task no corre', async () => {
    setRunning(false);
    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    });
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      WORKDAY_BACKGROUND_TASK,
      expect.any(Object),
    );
  });

  it('inicia el tracking cuando la jornada está IN_SERVICE y el task no corre', async () => {
    setSession('IN_SERVICE');
    setRunning(false);
    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('no inicia el tracking si el task ya está corriendo', async () => {
    setRunning(true);
    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.hasStartedLocationUpdatesAsync).toHaveBeenCalled();
    });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('no detiene el tracking en AVAILABLE aunque no haya servicios activos', async () => {
    setRunning(true);
    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.hasStartedLocationUpdatesAsync).toHaveBeenCalled();
    });
    expect(ExpoLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('no detiene el tracking por un UNAVAILABLE transitorio', async () => {
    setRunning(true);
    await renderHook(() => useServiceTracking());

    await act(async () => {
      useAuthStore.getState().setOperationalStatus('UNAVAILABLE');
    });

    await waitFor(() => {
      expect(ExpoLocation.hasStartedLocationUpdatesAsync).toHaveBeenCalled();
    });
    expect(ExpoLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('no detiene el tracking durante la restauración de sesión con token persistido', async () => {
    setSession('IN_SERVICE', { accessToken: null, isAuthenticated: false });
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue('persisted-token');
    setRunning(true);

    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(secureStorage.getAccessToken).toHaveBeenCalled();
    });
    expect(ExpoLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('detiene el tracking cuando no hay sesión ni token persistido', async () => {
    setSession('UNAVAILABLE', { accessToken: null, isAuthenticated: false, user: false });
    (secureStorage.getAccessToken as jest.Mock).mockResolvedValue(null);
    setRunning(true);

    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('reintenta iniciar el tracking al volver a foreground tras conceder permisos', async () => {
    setSession('AVAILABLE');
    setRunning(false);
    (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    await renderHook(() => useServiceTracking());

    await waitFor(() => {
      expect(ExpoLocation.getForegroundPermissionsAsync).toHaveBeenCalled();
    });
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
    expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(appStateListeners.length).toBeGreaterThan(0);
    });

    (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (ExpoLocation.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });

    await act(async () => {
      appStateListeners.at(-1)!('active');
    });

    await waitFor(() => {
      expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
    });
  });
});
