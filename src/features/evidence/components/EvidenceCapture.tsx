import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { CameraView } from 'expo-camera';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { useUploadEvidence } from '../hooks/useUploadEvidence';

interface EvidenceCaptureProps {
  serviceId: string;
  onUploaded: () => void;
}

export function EvidenceCapture({ serviceId, onUploaded }: EvidenceCaptureProps) {
  const cameraRef = useRef<CameraView>(null);
  const { colors } = useTheme();
  const { imageUri, uploading, uploaded, error, permissionGranted, requestPermission, setImageUri, upload } =
    useUploadEvidence();

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 });
    if (photo?.uri) setImageUri(photo.uri);
  };

  const handleUpload = async () => {
    const ok = await upload(serviceId);
    if (ok) onUploaded();
  };

  if (uploaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.successText, { color: colors.successText }]}>✓ Evidencia subida correctamente</Text>
      </View>
    );
  }

  if (permissionGranted === null || permissionGranted === false) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <Text style={[styles.label, { color: colors.neutral500 }]}>Se requiere evidencia fotográfica</Text>
        {permissionGranted === false && (
          <Text style={[styles.errorText, { color: colors.danger }]}>Permiso de cámara denegado</Text>
        )}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={requestPermission}>
          <Text style={[styles.btnText, { color: colors.white }]}>Permitir cámara</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.label, { color: colors.neutral500 }]}>Evidencia de entrega</Text>

      {imageUri ? (
        <View>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <View style={styles.row}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.neutral100 }]}
              onPress={() => setImageUri('')}
            >
              <Text style={[styles.btnText, { color: colors.neutral800 }]}>Retomar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, uploading && styles.btnDisabled]}
              onPress={handleUpload}
              disabled={uploading}
            >
              {uploading ? <ActivityIndicator color={colors.white} /> : <Text style={[styles.btnText, { color: colors.white }]}>Subir foto</Text>}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View>
          <CameraView ref={cameraRef} style={styles.camera} facing="back" />
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.primary }]} onPress={handleTakePhoto}>
            <Text style={[styles.btnText, { color: colors.white }]}>Tomar foto</Text>
          </TouchableOpacity>
        </View>
      )}

      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.md },
  camera: { width: '100%', height: 220, borderRadius: borderRadius.sm, overflow: 'hidden', marginBottom: spacing.md },
  preview: { width: '100%', height: 220, borderRadius: borderRadius.sm, marginBottom: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  btn: { flex: 1, borderRadius: borderRadius.md, paddingVertical: 12, alignItems: 'center', marginTop: spacing.xs },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  successText: { fontWeight: fontWeight.semibold, textAlign: 'center', paddingVertical: spacing.sm },
  errorText: { fontSize: fontSize.xs, marginTop: spacing.sm, textAlign: 'center' },
});
