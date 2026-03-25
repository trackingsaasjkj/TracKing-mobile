import { renderHook, act } from '@testing-library/react-native';
import { useUploadEvidence } from '@/features/evidence/hooks/useUploadEvidence';
import { evidenceApi } from '@/features/evidence/api/evidenceApi';
import { Camera } from 'expo-camera';

jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(),
  },
  CameraView: 'CameraView',
}));
jest.mock('@/features/evidence/api/evidenceApi');

describe('useUploadEvidence', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts with no image and not uploaded', () => {
    const { result } = renderHook(() => useUploadEvidence());
    expect(result.current.imageUri).toBeNull();
    expect(result.current.uploaded).toBe(false);
    expect(result.current.uploading).toBe(false);
  });

  it('requestPermission sets permissionGranted true when granted', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    const { result } = renderHook(() => useUploadEvidence());

    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permissionGranted).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('requestPermission sets error when denied', async () => {
    (Camera.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    const { result } = renderHook(() => useUploadEvidence());

    await act(async () => { await result.current.requestPermission(); });
    expect(result.current.permissionGranted).toBe(false);
    expect(result.current.error).toBe('Permiso de cámara denegado');
  });

  it('setImageUri updates imageUri', () => {
    const { result } = renderHook(() => useUploadEvidence());
    act(() => { result.current.setImageUri('file://photo.jpg'); });
    expect(result.current.imageUri).toBe('file://photo.jpg');
  });

  it('upload fails with error when no image set', async () => {
    const { result } = renderHook(() => useUploadEvidence());
    let ok: boolean = true;
    await act(async () => { ok = await result.current.upload('svc-1'); });
    expect(ok).toBe(false);
    expect(result.current.error).toBe('Primero toma una foto');
  });

  it('upload succeeds and sets uploaded=true', async () => {
    (evidenceApi.upload as jest.Mock).mockResolvedValue({ id: 'ev-1' });
    const { result } = renderHook(() => useUploadEvidence());

    act(() => { result.current.setImageUri('file://photo.jpg'); });

    let ok: boolean = false;
    await act(async () => { ok = await result.current.upload('svc-1'); });

    expect(ok).toBe(true);
    expect(result.current.uploaded).toBe(true);
    expect(evidenceApi.upload).toHaveBeenCalledWith('svc-1', { image_url: 'file://photo.jpg' });
  });

  it('upload returns false and sets error on API failure', async () => {
    (evidenceApi.upload as jest.Mock).mockRejectedValue({ userMessage: 'Error al subir' });
    const { result } = renderHook(() => useUploadEvidence());

    act(() => { result.current.setImageUri('file://photo.jpg'); });

    let ok: boolean = true;
    await act(async () => { ok = await result.current.upload('svc-1'); });

    expect(ok).toBe(false);
    expect(result.current.error).toBe('Error al subir');
  });

  it('reset clears all state', async () => {
    (evidenceApi.upload as jest.Mock).mockResolvedValue({});
    const { result } = renderHook(() => useUploadEvidence());

    act(() => { result.current.setImageUri('file://photo.jpg'); });
    await act(async () => { await result.current.upload('svc-1'); });
    act(() => { result.current.reset(); });

    expect(result.current.imageUri).toBeNull();
    expect(result.current.uploaded).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
