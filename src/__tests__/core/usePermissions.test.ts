import { renderHook } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import { usePermissions } from '@/core/hooks/usePermissions';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  requestBackgroundPermissionsAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock('expo-camera', () => ({
  requestCameraPermissionsAsync: jest.fn(),
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
    renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('pide permiso de ubicación en segundo plano al montar', async () => {
    renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('pide permiso de cámara al montar', async () => {
    renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalledTimes(1);
  });

  it('pide los tres permisos sin importar si hay sesión activa', async () => {
    renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
    expect(Location.requestBackgroundPermissionsAsync).toHaveBeenCalled();
    expect(Camera.requestCameraPermissionsAsync).toHaveBeenCalled();
  });
});

// ─── Orden correcto ───────────────────────────────────────────────────────────

describe('usePermissions — orden de solicitud', () => {
  it('pide foreground antes que background (requerido en Android)', async () => {
    const callOrder: string[] = [];
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('foreground');
      return { status: 'granted' };
    });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('background');
      return { status: 'granted' };
    });
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockImplementation(async () => {
      callOrder.push('camera');
      return { status: 'granted' };
    });

    renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

    expect(callOrder[0]).toBe('foreground');
    expect(callOrder[1]).toBe('background');
    expect(callOrder[2]).toBe('camera');
  });
});

// ─── No pide dos veces ────────────────────────────────────────────────────────

describe('usePermissions — guard contra doble solicitud', () => {
  it('no pide permisos dos veces si el hook se re-renderiza', async () => {
    const { rerender } = renderHook(() => usePermissions());
    await act(async () => { await Promise.resolve(); });
    rerender({});
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
    expect(() => renderHook(() => usePermissions())).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });

  it('no lanza si el permiso de cámara es denegado', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    expect(() => renderHook(() => usePermissions())).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });

  it('no lanza si el permiso de ubicación es denegado', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    (Location.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    expect(() => renderHook(() => usePermissions())).not.toThrow();
    await act(async () => { await Promise.resolve(); });
  });
});
