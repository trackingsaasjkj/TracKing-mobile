import { useAuthStore } from '@/features/auth/store/authStore';
import type { CourierUser } from '@/features/auth/types/auth.types';

// Mock secureStorage so tests don't touch the device keychain
jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: {
    setToken: jest.fn(),
    clearToken: jest.fn(),
    getToken: jest.fn().mockResolvedValue(null),
  },
}));

const mockUser: CourierUser = {
  id: 'user-1',
  name: 'Juan Pérez',
  email: 'juan@empresa.com',
  role: 'COURIER',
  company_id: 'company-1',
  operationalStatus: 'UNAVAILABLE',
};

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('starts unauthenticated', () => {
    const { isAuthenticated, user, accessToken } = useAuthStore.getState();
    expect(isAuthenticated).toBe(false);
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });

  it('setSession authenticates the user', () => {
    useAuthStore.getState().setSession(mockUser, 'token-abc');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.name).toBe('Juan Pérez');
    expect(state.accessToken).toBe('token-abc');
  });

  it('clearSession resets to unauthenticated', () => {
    useAuthStore.getState().setSession(mockUser, 'token-abc');
    useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });

  it('setOperationalStatus updates user status', () => {
    useAuthStore.getState().setSession(mockUser, 'token-abc');
    useAuthStore.getState().setOperationalStatus('AVAILABLE');
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
  });

  it('setOperationalStatus is a no-op when user is null', () => {
    useAuthStore.getState().setOperationalStatus('AVAILABLE');
    expect(useAuthStore.getState().user).toBeNull();
  });
});
