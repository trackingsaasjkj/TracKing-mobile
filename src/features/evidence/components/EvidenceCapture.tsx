import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { CameraView } from 'expo-camera';
import { useUploadEvidence } from '../hooks/useUploadEvidence';

interface EvidenceCaptureProps {
  serviceId: string;
  onUploaded: () => void;
}

export function EvidenceCapture({ serviceId, onUploaded }: EvidenceCaptureProps) {
  const cameraRef = useRef<CameraView>(null);
  const {
    imageUri,
    uploading,
    uploaded,
    error,
    permissionGranted,
    requestPermission,
    setImageUri,
    upload,
  } = useUploadEvidence();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) {
      setImageUri(photo.uri);
    }
  };

  const handleUpload = async () => {
    const ok = await upload(serviceId);
    if (ok) onUploaded();
  };

  if (uploaded) {
    return (
      <View style={styles.container}>
        <Text style={styles.successText}>✓ Evidencia subida correctamente</Text>
      </View>
    );
  }

  if (permissionGranted === null || permissionGranted === false) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Se requiere evidencia fotográfica</Text>
        {permissionGranted === false && (
          <Text style={styles.errorText}>Permiso de cámara denegado</Text>
        )}
        <TouchableOpacity style={styles.btn} onPress={handleRequestPermission}>
          <Text style={styles.btnText}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Evidencia de entrega</Text>

      {imageUri ? (
        <View>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, styles.btnSecondary]}
              onPress={() => setImageUri('')}
            >
              <Text style={[styles.btnText, styles.btnTextSecondary]}>Retomar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, uploading && styles.btnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Subir foto</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <TouchableOpacity style={styles.btn} onPress={handleTakePhoto}>
            <Text style={styles.btnText}>Tomar foto</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  camera: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 10,
  },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  btn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  btnSecondary: {
    backgroundColor: '#F3F4F6',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  btnTextSecondary: {
    color: '#374151',
  },
  successText: {
    color: '#16A34A',
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 6,
    textAlign: 'center',
  },
});
