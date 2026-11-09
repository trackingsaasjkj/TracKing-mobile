import { renderHook, waitFor } from '@testing-library/react-native';
import { useSessionRestore } from '@/core/hooks/useSessionRestore';
import { useAuthStore } from '@/features/auth/store/authStore';
import { apiClient } from '@/core/api/apiClient';
import { secureStorage } from '@/core/storage/secureStorage';
import {
  startWorkdayLocationUpdates,
  stopWorkdayLocationUpdates,
} from '@/features/tracking/hooks/useWorkdayTracking';

jest.mock('@/core/api/apiClient', () => ({
  apiClient: { get: jest.fn() },
  unwrap: (res: any) => res.data.data,
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setAccessToken: jest.fn(() => Promise.resolve()),
    setRefreshToken: jest.fn(() => Promise.resolve()),
    clearAllTokens: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('@/features/tracking/hooks/useWorkdayTracking', () => ({
  startWorkdayLocationUpdates: jest.fn(),
  stopWorkdayLocationUpdates: jest.fn(),
}));

const mockGet = apiClient.get as jest.Mock;
const mockGetAccessToken = secureStorage.getAccessToken as jest.Mock;
const mockGetRefreshToken = secureStorage.getRefreshToken as jest.Mock;
const mockClearAllTokens = secureStorage.clearAllTokens as jest.Mock;
const mockStartTracking = startWorkdayLocationUpdates as jest.Mock;
const mockStopTracking = stopWorkdayLocationUpdates as jest.Mock;

function profile(status: 'AVAILABLE' | 'IN_SERVICE' | 'UNAVAILABLE') {
  return {
    id: 'c1',
    user_id: 'u1',
    company_id: 'co1',
    operational_status: status,
    user: { id: 'u1', name: 'Test', email: 't@t.com' },
  };
}

function resolveProfile(status: 'AVAILABLE' | 'IN_SERVICE' | 'UNAVAILABLE') {
  mockGet.mockResolvedValue({ data: { success: true, data: profile(status) } });
}

beforeEach(() => {
  jest.clearAllMocks();
  useAuthStore.setState({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
  });
  mockGetAccessToken.mockResolvedValue('stored-access');
  mockGetRefreshToken.mockResolvedValue('stored-refresh');
  mockStartTracking.mockResolvedValue({ success: true });
  mockStopTracking.mockResolvedValue({ success: true });
});

describe('useSessionRestore', () => {
  it('restaura la sesión y arranca el tracking en AVAILABLE', async () => {
    resolveProfile('AVAILABLE');

    const { result } = await renderHook(() => useSessionRestore());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(useAuthStore.getState().isAuthenticated).toBe(true);
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
    expect(mockStartTracking).toHaveBeenCalledWith({ interactive: false });
    expect(mockStopTracking).not.toHaveBeenCalled();
  });

  it('detiene el tracking cuando el perfil autoritativo es UNAVAILABLE', async () => {
    resolveProfile('UNAVAILABLE');

    const { result } = await renderHook(() => useSessionRestore());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(mockStopTracking).toHaveBeenCalledTimes(1);
    expect(mockStartTracking).not.toHaveBeenCalled();
  });

  it('no borra la sesión ante un error de red', async () => {
    mockGet.mockRejectedValue(new Error('Network Error'));

    const { result } = await renderHook(() => useSessionRestore());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(mockClearAllTokens).not.toHaveBeenCalled();
  });

  it('borra la sesión cuando el token es rechazado (401)', async () => {
    mockGet.mockRejectedValue({ response: { status: 401 } });

    const { result } = await renderHook(() => useSessionRestore());
    await waitFor(() => expect(result.current.isRestoring).toBe(false));

    expect(mockClearAllTokens).toHaveBeenCalledTimes(1);
  });
});
