import { renderHook } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { usePermissions } from '@/core/hooks/usePermissions';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-camera', () => ({
  Camera: { requestCameraPermissionsAsync: jest.fn() },
}));

beforeEach(() => {
  jest.clearAllMocks();
  (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
});

// ─── Solicitud automática al montar ──────────────────────────────────────────

describe('usePermissions — solicitud automática', () => {
  it('pide permiso de ubicación en primer plano al montar', async () => {
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('no pide permiso de ubicación en segundo plano al montar', async () => {
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('pide permiso de cámara al montar', async () => {
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('pide ubicación y cámara sin importar si hay sesión activa', async () => {
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
  });
});

// ─── Orden correcto ───────────────────────────────────────────────────────────

describe('usePermissions — orden de solicitud', () => {
  it('pide ubicación antes que cámara', async () => {
    const callOrder: string[] = [];
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('foreground');
      return { status: 'granted' };
    });
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('camera');
      return { status: 'granted' };
    });

    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(callOrder[0]).toBe('foreground');
    expect(callOrder[1]).toBe('camera');
    expect(Location.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });
});

// ─── No pide dos veces ────────────────────────────────────────────────────────

describe('usePermissions — guard contra doble solicitud', () => {
  it('no pide permisos dos veces si el hook se re-renderiza', async () => {
    const { rerender } = await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    await rerender({});
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });
});

// ─── Resistencia a errores ────────────────────────────────────────────────────

describe('usePermissions — resistencia a errores', () => {
  it('no lanza si la API de permisos falla', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockRejectedValue(
      new Error('Permissions API unavailable'),
    );
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
  });

  it('no lanza si el permiso de cámara es denegado', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
  });

  it('no lanza si el permiso de ubicación es denegado', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    await renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
  });
});
