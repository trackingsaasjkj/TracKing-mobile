import React, { useRef, useState } from 'react'
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Image,
} from 'react-native'
import { CameraView } from 'expo-camera'
import * as ExpoLocation from 'expo-location'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import { compressEvidenceImage } from '@/features/evidence/utils/compressImage'
import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient'
import type { RouteStop } from '../types/routes.types'

export interface StopCompletionData {
  latitude: number
  longitude: number
  photo_url?: string
  notes?: string
}

interface CompleteStopModalProps {
  stop: RouteStop
  visible: boolean
  onConfirm: (data: StopCompletionData) => Promise<void>
  onCancel: () => void
}

/** Sube una foto de parada como multipart y retorna la URL pública */
async function uploadStopPhoto(imageUri: string): Promise<string> {
  const formData = new FormData()
  formData.append('file', { uri: imageUri, name: 'parada.jpg', type: 'image/jpeg' } as any)
  const res = await apiClient.post<ApiResponse<{ image_url: string }>>(
    '/api/routes/stop-photo',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30_000,
      transformRequest: (data) => data,
    },
  )
  return unwrap(res).image_url
}

type Step = 'confirm' | 'camera' | 'submitting'

export function CompleteStopModal({ stop, visible, onConfirm, onCancel }: CompleteStopModalProps) {
  const { colors } = useTheme()
  const cameraRef = useRef<CameraView>(null)

  const [step, setStep] = useState<Step>('confirm')
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isPickup = stop.stop_type === 'PICKUP'

  // ── Reset state when modal closes ────────────────────────────────────────
  const handleCancel = () => {
    setStep('confirm')
    setPhotoUri(null)
    setError(null)
    onCancel()
  }

  // ── Request camera permission and move to camera step ────────────────────
  const handleRequestCamera = async () => {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
    // We need camera too
    const { Camera } = await import('expo-camera')
    const cam = await Camera.requestCameraPermissionsAsync()
    setCameraPermission(cam.status === 'granted')
    if (cam.status !== 'granted') {
      setError('Permiso de cámara denegado')
      return
    }
    setError(null)
    setStep('camera')
  }

  // ── Take photo ───────────────────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7 })
      if (photo?.uri) {
        const compressed = await compressEvidenceImage(photo.uri)
        setPhotoUri(compressed)
        setStep('confirm')
      }
    } catch {
      setError('Error al tomar la foto')
    }
  }

  // ── Submit with real GPS coords ──────────────────────────────────────────
  const handleSubmit = async () => {
    setStep('submitting')
    setError(null)
    try {
      // Get current position — use low accuracy for speed
      let latitude = 0
      let longitude = 0
      try {
        const { status } = await ExpoLocation.requestForegroundPermissionsAsync()
        if (status === 'granted') {
          const loc = await ExpoLocation.getCurrentPositionAsync({
            accuracy: ExpoLocation.Accuracy.Balanced,
          })
          latitude = loc.coords.latitude
          longitude = loc.coords.longitude
        }
      } catch {
        // GPS failed — proceed without coords (backend allows lat=0 on some configs)
      }

      // Upload photo to backend and get public URL
      let photoUrl: string | undefined
      if (photoUri) {
        try {
          photoUrl = await uploadStopPhoto(photoUri)
        } catch {
          // Photo upload failed — proceed without photo rather than blocking the stop
          photoUrl = undefined
        }
      }

      await onConfirm({ latitude, longitude, photo_url: photoUrl })
      setStep('confirm')
      setPhotoUri(null)
    } catch (err: any) {
      setError(err?.userMessage ?? 'Error al completar la parada')
      setStep('confirm')
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.typeBadge, { backgroundColor: isPickup ? colors.warningBg : colors.infoBg }]}>
              <Text style={[styles.typeText, { color: isPickup ? colors.warningText : colors.infoText }]}>
                {isPickup ? 'RECOGIDA' : 'ENTREGA'} #{stop.sequence_order}
              </Text>
            </View>
            <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={colors.neutral500} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Address */}
            <Text style={[styles.address, { color: colors.neutral900 }]}>{stop.address}</Text>

            {/* Contact info */}
            {(stop.contact_name || stop.contact_phone) && (
              <View style={[styles.contactBox, { backgroundColor: colors.background }]}>
                {stop.contact_name && (
                  <View style={styles.contactRow}>
                    <Ionicons name="person-outline" size={14} color={colors.neutral500} />
                    <Text style={[styles.contactText, { color: colors.neutral600 }]}>{stop.contact_name}</Text>
                  </View>
                )}
                {stop.contact_phone && (
                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={14} color={colors.neutral500} />
                    <Text style={[styles.contactText, { color: colors.neutral600 }]}>{stop.contact_phone}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Package details */}
            {stop.package_details && (
              <Text style={[styles.packageDetails, { color: colors.neutral500 }]}>
                📦 {stop.package_details}
              </Text>
            )}

            {/* Camera step */}
            {step === 'camera' && (
              <View style={styles.cameraSection}>
                <CameraView ref={cameraRef} style={styles.camera} facing="back" />
                <TouchableOpacity
                  style={[styles.captureBtn, { backgroundColor: colors.primary }]}
                  onPress={handleTakePhoto}
                >
                  <Ionicons name="camera" size={20} color={colors.white} />
                  <Text style={[styles.captureBtnText, { color: colors.white }]}>Tomar foto</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Photo preview */}
            {photoUri && step !== 'camera' && (
              <View style={styles.previewSection}>
                <Image source={{ uri: photoUri }} style={styles.preview} />
                <TouchableOpacity
                  style={[styles.retakeBtn, { borderColor: colors.neutral200 }]}
                  onPress={() => setStep('camera')}
                >
                  <Ionicons name="camera-outline" size={16} color={colors.neutral600} />
                  <Text style={[styles.retakeBtnText, { color: colors.neutral600 }]}>Retomar foto</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Error */}
            {error && (
              <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>
            )}

            {/* Actions */}
            {step !== 'camera' && step !== 'submitting' && (
              <View style={styles.actions}>
                {!photoUri && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, { borderColor: colors.neutral200 }]}
                    onPress={handleRequestCamera}
                  >
                    <Ionicons name="camera-outline" size={16} color={colors.neutral600} />
                    <Text style={[styles.secondaryBtnText, { color: colors.neutral600 }]}>
                      Agregar foto
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: isPickup ? colors.warning : colors.primary }]}
                  onPress={handleSubmit}
                >
                  <Ionicons name="checkmark" size={18} color={colors.white} />
                  <Text style={[styles.primaryBtnText, { color: colors.white }]}>
                    Confirmar {isPickup ? 'recogida' : 'entrega'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {step === 'submitting' && (
              <View style={styles.submitting}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.submittingText, { color: colors.neutral500 }]}>
                  Registrando parada...
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  typeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  address: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
    lineHeight: fontSize.md * 1.4,
  },
  contactBox: {
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  contactText: { fontSize: fontSize.sm },
  packageDetails: {
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  cameraSection: { marginBottom: spacing.md },
  camera: { width: '100%', height: 240, borderRadius: borderRadius.md, overflow: 'hidden' },
  captureBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  captureBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  previewSection: { marginBottom: spacing.md },
  preview: { width: '100%', height: 200, borderRadius: borderRadius.md, marginBottom: spacing.sm },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  retakeBtnText: { fontSize: fontSize.sm },
  error: { fontSize: fontSize.xs, textAlign: 'center', marginBottom: spacing.md },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  secondaryBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  primaryBtnText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  submitting: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  submittingText: { fontSize: fontSize.sm },
})
