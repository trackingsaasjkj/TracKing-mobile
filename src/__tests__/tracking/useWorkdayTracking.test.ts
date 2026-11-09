import { renderHook, act } from '@testing-library/react-native';
import * as ExpoLocation from 'expo-location';
import {
  startWorkdayLocationUpdates,
  useWorkdayTracking,
  WORKDAY_LOCATION_TASK_OPTIONS,
} from '@/features/tracking/hooks/useWorkdayTracking';
import { WORKDAY_BACKGROUND_TASK } from '@/features/tracking/tasks/workdayBackgroundTask';

beforeEach(() => {
  jest.clearAllMocks();
  (ExpoLocation.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
  (ExpoLocation.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.requestBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
  (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
  (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  (ExpoLocation.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
});

describe('WORKDAY_LOCATION_TASK_OPTIONS', () => {
  it('configura el foreground service para toda la jornada', () => {
    expect(WORKDAY_LOCATION_TASK_OPTIONS).toMatchObject({
      accuracy: ExpoLocation.Accuracy.Balanced,
      timeInterval: 15_000,
      distanceInterval: 0,
      showsBackgroundLocationIndicator: true,
      foregroundService: expect.objectContaining({
        notificationTitle: 'Jornada activa',
        killServiceOnDestroy: false,
      }),
    });
  });
});

describe('startWorkdayLocationUpdates', () => {
  it('inicia el task con las opciones compartidas', async () => {
    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(true);
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledWith(
      WORKDAY_BACKGROUND_TASK,
      WORKDAY_LOCATION_TASK_OPTIONS,
    );
  });

  it('falla si los servicios de ubicación están desactivados', async () => {
    (ExpoLocation.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(false);

    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(false);
    expect(result.reason).toContain('desactivados');
    expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('falla si el permiso de ubicación en primer plano es denegado', async () => {
    (ExpoLocation.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Permiso de ubicación denegado');
    expect(ExpoLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('no bloquea el tracking si el permiso de background es denegado (FGS suficiente)', async () => {
    (ExpoLocation.getBackgroundPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });

    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(true);
    expect(result.warning).toContain('Permitir todo el tiempo');
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('en modo interactivo solicita los permisos al usuario', async () => {
    await startWorkdayLocationUpdates({ interactive: true });

    expect(ExpoLocation.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoLocation.requestBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoLocation.startLocationUpdatesAsync).toHaveBeenCalledTimes(1);
  });

  it('en modo no interactivo no muestra prompts de permisos', async () => {
    await startWorkdayLocationUpdates({ interactive: false });

    expect(ExpoLocation.getForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoLocation.getBackgroundPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(ExpoLocation.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(ExpoLocation.requestBackgroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('no vuelve a iniciar el task si ya está corriendo', async () => {
    (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);

    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(true);
    expect(ExpoLocation.startLocationUpdatesAsync).not.toHaveBeenCalled();
  });

  it('devuelve success:false si startLocationUpdatesAsync lanza un error', async () => {
    (ExpoLocation.startLocationUpdatesAsync as jest.Mock).mockRejectedValue(
      new Error('Native failure'),
    );

    const result = await startWorkdayLocationUpdates();

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Native failure');
  });
});

describe('useWorkdayTracking — stop', () => {
  it('detiene el task si está corriendo', async () => {
    (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(true);
    const { result } = await renderHook(() => useWorkdayTracking());

    let res: any;
    await act(async () => {
      res = await result.current.stopWorkdayTracking();
    });

    expect(res.success).toBe(true);
    expect(ExpoLocation.stopLocationUpdatesAsync).toHaveBeenCalledWith(WORKDAY_BACKGROUND_TASK);
  });

  it('no llama a stop si el task no está corriendo', async () => {
    (ExpoLocation.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
    const { result } = await renderHook(() => useWorkdayTracking());

    let res: any;
    await act(async () => {
      res = await result.current.stopWorkdayTracking();
    });

    expect(res.success).toBe(true);
    expect(ExpoLocation.stopLocationUpdatesAsync).not.toHaveBeenCalled();
  });
});
