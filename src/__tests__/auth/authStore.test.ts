import * as fc from 'fast-check';
import { useAuthStore } from '@/features/auth/store/authStore';
import type { CourierUser, OperationalStatus } from '@/features/auth/types/auth.types';

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

// ─── Factory ──────────────────────────────────────────────────────────────────

function makeUser(overrides: Partial<CourierUser> = {}): CourierUser {
  return {
    id: 'user-1',
    name: 'Carlos López',
    email: 'carlos@empresa.com',
    role: 'COURIER',
    company_id: 'company-1',
    operationalStatus: 'UNAVAILABLE',
    ...overrides,
  };
}

// ─── Estado inicial ───────────────────────────────────────────────────────────

describe('authStore — estado inicial', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('inicia sin autenticar', () => {
    const { isAuthenticated, user, accessToken } = useAuthStore.getState();
    expect(isAuthenticated).toBe(false);
    expect(user).toBeNull();
    expect(accessToken).toBeNull();
  });
});

// ─── setSession ───────────────────────────────────────────────────────────────

describe('authStore — setSession', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('autentica al usuario y guarda el token', async () => {
    const user = makeUser();
    await useAuthStore.getState().setSession(user, 'token-abc');
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user?.email).toBe('carlos@empresa.com');
    expect(state.accessToken).toBe('token-abc');
  });

  it('preserva todos los campos del usuario', async () => {
    const user = makeUser({ operationalStatus: 'IN_SERVICE' });
    await useAuthStore.getState().setSession(user, 'tok');
    expect(useAuthStore.getState().user?.operationalStatus).toBe('IN_SERVICE');
  });
});

// ─── clearSession ─────────────────────────────────────────────────────────────

describe('authStore — clearSession', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('limpia el estado completamente', async () => {
    await useAuthStore.getState().setSession(makeUser(), 'token-abc');
    await useAuthStore.getState().clearSession();
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
  });
});

// ─── setOperationalStatus ─────────────────────────────────────────────────────

describe('authStore — setOperationalStatus', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
  });

  it('actualiza el estado operacional del usuario', async () => {
    await useAuthStore.getState().setSession(makeUser(), 'tok');
    useAuthStore.getState().setOperationalStatus('AVAILABLE');
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
  });

  it('acepta IN_SERVICE sin convertirlo (fix BUG-tracking)', async () => {
    await useAuthStore.getState().setSession(makeUser(), 'tok');
    useAuthStore.getState().setOperationalStatus('IN_SERVICE');
    expect(useAuthStore.getState().user?.operationalStatus).toBe('IN_SERVICE');
  });

  it('es no-op cuando user es null', () => {
    useAuthStore.getState().setOperationalStatus('AVAILABLE');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('no modifica otros campos del usuario al cambiar status', async () => {
    const user = makeUser({ name: 'Carlos', company_id: 'co-99' });
    await useAuthStore.getState().setSession(user, 'tok');
    useAuthStore.getState().setOperationalStatus('AVAILABLE');
    const updated = useAuthStore.getState().user!;
    expect(updated.name).toBe('Carlos');
    expect(updated.company_id).toBe('co-99');
  });
});

// ─── PBT: setSession → clearSession → isAuthenticated = false ────────────────

describe('P-1: round-trip setSession → clearSession (PBT)', () => {
  it('P-1: siempre termina en isAuthenticated=false tras clearSession', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 50 }),
        fc.string({ minLength: 10, maxLength: 100 }),
        async (name, token) => {
          useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
          await useAuthStore.getState().setSession(makeUser({ name }), token);
          await useAuthStore.getState().clearSession();
          expect(useAuthStore.getState().isAuthenticated).toBe(false);
          expect(useAuthStore.getState().user).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── PBT: setOperationalStatus preserva identidad del usuario ─────────────────

describe('P-2: setOperationalStatus nunca corrompe otros campos (PBT)', () => {
  it('P-2: cualquier status válido preserva id, email y company_id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('AVAILABLE', 'UNAVAILABLE', 'IN_SERVICE') as fc.Arbitrary<OperationalStatus>,
        async (status) => {
          const user = makeUser({ id: 'fixed-id', email: 'fixed@test.com', company_id: 'fixed-co' });
          useAuthStore.setState({ user: null, accessToken: null, isAuthenticated: false });
          await useAuthStore.getState().setSession(user, 'tok');
          useAuthStore.getState().setOperationalStatus(status);
          const updated = useAuthStore.getState().user!;
          expect(updated.id).toBe('fixed-id');
          expect(updated.email).toBe('fixed@test.com');
          expect(updated.company_id).toBe('fixed-co');
          expect(updated.operationalStatus).toBe(status);
        },
      ),
      { numRuns: 100 },
    );
  });
});
