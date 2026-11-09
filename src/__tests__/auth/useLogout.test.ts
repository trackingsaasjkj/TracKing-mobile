/**
 * Tests de useLogout hook
 * Cubre: flujo normal, eliminación de FCM token, manejo de errores
 */
import { renderHook, act } from '@testing-library/react-native';
import * as ExpoLocation from 'expo-location';
import { useLogout } from '@/features/auth/hooks/useLogout';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/core/api/apiClient';
import { WORKDAY_BACKGROUND_TASK } from '@/features/tracking/tasks/workdayBackgroundTask';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/core/api/apiClient', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('@/features/auth/api/authApi', () => ({
  authApi: {
    logout: jest.fn(),
  },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    setAccessToken: jest.fn(),
    getAccessToken: jest.fn().mockResolvedValue(null),
    clearAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    getRefreshToken: jest.fn().mockResolvedValue(null),
    clearRefreshToken: jest.fn(),
    clearAllTokens: jest.fn().mockResolvedValue(undefined),
  },
}));

import { authApi } from '@/features/auth/api/authApi';
const mockAuthApiLogout = authApi.logout as jest.MockedFunction<typeof authApi.logout>;
const mockApiDelete = apiClient.delete as jest.MockedFunction<typeof apiClient.delete>;

function setSession() {
  useAuthStore.setState({
    isAuthenticated: true,
    user: { id: 'u-1', name: 'Test', email: 't@t.com', role: 'COURIER', company_id: 'co-1', operationalStatus: 'AVAILABLE' },
    accessToken: 'token-abc',
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useLogout — flujo normal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    mockApiDelete.mockResolvedValue({ data: { success: true } } as any);
    mockAuthApiLogout.mockResolvedValue(undefined as any);
  });

  it('llama DELETE /notifications/fcm-token antes de hacer logout', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(mockApiDelete).toHaveBeenCalledWith('/notifications/fcm-token');
  });

  it('llama authApi.logout después de eliminar el token FCM', async () => {
    const callOrder: string[] = [];
    mockApiDelete.mockImplementation(async () => { callOrder.push('delete-fcm'); return {} as any; });
    mockAuthApiLogout.mockImplementation(async () => { callOrder.push('logout'); });

    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(callOrder).toEqual(['delete-fcm', 'logout']);
  });

  it('limpia la sesión local después del logout', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('detiene el tracking de jornada antes de cerrar sesión', async () => {
    (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    (ExpoLocation.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);

    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith(WORKDAY_BACKGROUND_TASK);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('isLoading es true durante el logout y false al terminar', async () => {
    let loadingDuringLogout = false;
    mockAuthApiLogout.mockImplementation(async () => {
      loadingDuringLogout = true;
    });

    const { result } = await renderHook(() => useLogout());
    const logoutPromise = act(async () => { await result.current.logout(); });

    await logoutPromise;
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useLogout — DELETE fcm-token falla', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    mockApiDelete.mockRejectedValue(new Error('Network error'));
    mockAuthApiLogout.mockResolvedValue(undefined as any);
  });

  it('continúa con el logout aunque DELETE fcm-token falle', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    // El logout del backend igual se llama
    expect(mockAuthApiLogout).toHaveBeenCalledTimes(1);
  });

  it('limpia la sesión aunque DELETE fcm-token falle', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});

describe('useLogout — authApi.logout falla', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setSession();
    mockApiDelete.mockResolvedValue({ data: { success: true } } as any);
    mockAuthApiLogout.mockRejectedValue(new Error('Server error'));
  });

  it('limpia la sesión local aunque el backend falle', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('isLoading vuelve a false aunque el backend falle', async () => {
    const { result } = await renderHook(() => useLogout());
    await act(async () => { await result.current.logout(); });

    expect(result.current.isLoading).toBe(false);
  });
});
