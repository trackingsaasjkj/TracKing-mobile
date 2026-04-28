import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Camera from 'expo-camera';
import { useAuthStore } from '@/features/auth/store/authStore';

interface PermissionStatus {
  location: boolean;
  camera: boolean;
}

export function usePermissions() {
  const user = useAuthStore((s) => s.user);
  const [permissionsRequested, setPermissionsRequested] = useState(false);
  const [permissions, setPermissions] = useState<PermissionStatus>({
    location: false,
    camera: false,
  });

  useEffect(() => {
    if (!user || permissionsRequested) return;

    const requestPermissions = async () => {
      try {
        // Request location permission
        const locationResult = await Location.requestForegroundPermissionsAsync();
        setPermissions((p) => ({ ...p, location: locationResult.status === 'granted' }));

        // Request camera permission
        const cameraResult = await Camera.requestCameraPermissionsAsync();
        setPermissions((p) => ({ ...p, camera: cameraResult.status === 'granted' }));

        setPermissionsRequested(true);
      } catch (error) {
        console.error('Error requesting permissions:', error);
        setPermissionsRequested(true);
      }
    };

    requestPermissions();
  }, [user, permissionsRequested]);

  return permissions;
}
