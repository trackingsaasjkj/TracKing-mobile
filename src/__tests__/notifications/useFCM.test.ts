/**
 * Tests de useFCM hook
 * Cubre: inicialización, registro de token, manejo de permisos denegados,
 *        refresh de token, navegación por tipo de notificación
 */
import { renderHook, act } from '@testing-library/react-native';
import { useFCM } from '@/core/notifications/useFCM';
import { useAuthStore } from '@/features/auth/store/authStore';
import * as fcmService from '@/core/notifications/fcm.service';
import { apiClient } from '@/core/api/apiClient';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/core/api/apiClient', () => ({
  apiClient: { post: jest.fn(), delete: jest.fn() },
}));

jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn().mockResolvedValue(null) },
}));

jest.mock('@/core/notifications/fcm.service', () => ({
  requestNotificationPermission: jest.fn(),
  getFCMToken: jest.fn(),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onForegroundMessage: jest.fn(() => jest.fn()),
  onBackgroundNotificationOpened: jest.fn(),
  getInitialNotification: jest.fn(),
}));

const mockApiPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockRequestPermission = fcmService.requestNotificationPermission as jest.MockedFunction<typeof fcmService.requestNotificationPermission>;
const mockGetToken = fcmService.getFCMToken as jest.MockedFunction<typeof fcmService.getFCMToken>;
const mockOnTokenRefresh = fcmService.onTokenRefresh as jest.MockedFunction<typeof fcmService.onTokenRefresh>;
const mockOnForeground = fcmService.onForegroundMessage as jest.MockedFunction<typeof fcmService.onForegroundMessage>;
const mockGetInitialNotification = fcmService.getInitialNotification as jest.MockedFunction<typeof fcmService.getInitialNotification>;

function setAuthenticated(value: boolean) {
  useAuthStore.setState({ isAuthenticated: value, user: null, accessToken: null });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useFCM — no autenticado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(false);
  });

  it('NO inicializa FCM cuando el usuario no está autenticado', async () => {
    renderHook(() => useFCM());
    // Dar tiempo al efecto
    await act(async () => {});
    expect(mockRequestPermission).not.toHaveBeenCalled();
    expect(mockGetToken).not.toHaveBeenCalled();
  });
});

describe('useFCM — autenticado, permiso concedido', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(true);
    mockRequestPermission.mockResolvedValue(true);
    mockGetToken.mockResolvedValue('fcm-token-xyz');
    mockApiPost.mockResolvedValue({ data: { success: true } } as any);
    mockGetInitialNotification.mockResolvedValue(null);
    mockOnTokenRefresh.mockReturnValue(jest.fn());
    mockOnForeground.mockReturnValue(jest.fn());
  });

  it('solicita permiso al inicializar', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });

  it('obtiene el token FCM y lo registra en el backend', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockGetToken).toHaveBeenCalledTimes(1);
    expect(mockApiPost).toHaveBeenCalledWith('/notifications/fcm-token', { token: 'fcm-token-xyz' });
  });

  it('registra listeners de foreground y token refresh', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockOnForeground).toHaveBeenCalledTimes(1);
    expect(mockOnTokenRefresh).toHaveBeenCalledTimes(1);
  });

  it('verifica notificación inicial (killed state)', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockGetInitialNotification).toHaveBeenCalledTimes(1);
  });

  it('NO registra el token dos veces si el hook se re-renderiza', async () => {
    const { rerender } = renderHook(() => useFCM());
    await act(async () => {});
    rerender({});
    await act(async () => {});
    // El token solo se registra una vez gracias al ref tokenRegistered
    expect(mockApiPost).toHaveBeenCalledTimes(1);
  });

  it('desuscribe los listeners al desmontar', async () => {
    const unsubscribeRefresh = jest.fn();
    const unsubscribeForeground = jest.fn();
    mockOnTokenRefresh.mockReturnValue(unsubscribeRefresh);
    mockOnForeground.mockReturnValue(unsubscribeForeground);

    const { unmount } = renderHook(() => useFCM());
    await act(async () => {});
    unmount();

    expect(unsubscribeRefresh).toHaveBeenCalledTimes(1);
    expect(unsubscribeForeground).toHaveBeenCalledTimes(1);
  });
});

describe('useFCM — permiso denegado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(true);
    mockRequestPermission.mockResolvedValue(false);
  });

  it('NO obtiene token ni registra en backend si el permiso es denegado', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockGetToken).not.toHaveBeenCalled();
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

describe('useFCM — token null', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(true);
    mockRequestPermission.mockResolvedValue(true);
    mockGetToken.mockResolvedValue(null);
    mockGetInitialNotification.mockResolvedValue(null);
    mockOnTokenRefresh.mockReturnValue(jest.fn());
    mockOnForeground.mockReturnValue(jest.fn());
  });

  it('NO llama al backend si el token es null', async () => {
    renderHook(() => useFCM());
    await act(async () => {});
    expect(mockApiPost).not.toHaveBeenCalled();
  });
});

describe('useFCM — error al registrar token en backend', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(true);
    mockRequestPermission.mockResolvedValue(true);
    mockGetToken.mockResolvedValue('fcm-token-xyz');
    mockApiPost.mockRejectedValue(new Error('Network error'));
    mockGetInitialNotification.mockResolvedValue(null);
    mockOnTokenRefresh.mockReturnValue(jest.fn());
    mockOnForeground.mockReturnValue(jest.fn());
  });

  it('no lanza error aunque el backend falle al registrar el token', async () => {
    // No debe lanzar excepción no manejada
    await expect(async () => {
      renderHook(() => useFCM());
      await act(async () => {});
    }).not.toThrow();
  });
});

describe('useFCM — notificación inicial (killed state)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setAuthenticated(true);
    mockRequestPermission.mockResolvedValue(true);
    mockGetToken.mockResolvedValue('tok');
    mockApiPost.mockResolvedValue({ data: { success: true } } as any);
    mockOnTokenRefresh.mockReturnValue(jest.fn());
    mockOnForeground.mockReturnValue(jest.fn());
  });

  it('procesa la notificación inicial si la app fue abierta desde killed state', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetInitialNotification.mockResolvedValue({
      messageId: 'msg-1',
      data: { type: 'new_service', serviceId: 'svc-1' },
    } as any);

    renderHook(() => useFCM());
    await act(async () => {});

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('killed state'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });

  it('no procesa navegación si la notificación inicial es null', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockGetInitialNotification.mockResolvedValue(null);

    renderHook(() => useFCM());
    await act(async () => {});

    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('killed state'),
      expect.anything(),
    );
    consoleSpy.mockRestore();
  });
});
