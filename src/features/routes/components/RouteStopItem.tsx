import React, { useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/shared/ui/useTheme'
import { fontSize, fontWeight } from '@/shared/ui/typography'
import { spacing, borderRadius } from '@/shared/ui/spacing'
import { Button } from '@/shared/ui/components/Button'
import { CompleteStopModal } from './CompleteStopModal'
import type { RouteStop, RouteStopStatus } from '../types/routes.types'
import type { StopCompletionData } from './CompleteStopModal'

interface RouteStopItemProps {
  stop: RouteStop
  isActive: boolean
  isLast: boolean
  routeId: string
  onCompleted: (stopId: string, data: StopCompletionData) => Promise<void>
}

function StopStatusIcon({ status }: { status: RouteStopStatus }) {
  const { colors } = useTheme()
  if (status === 'COMPLETED') {
    return <Ionicons name="checkmark-circle" size={22} color={colors.success} />
  }
  return <Ionicons name="ellipse-outline" size={22} color={colors.neutral400} />
}

function ContactActions({ phone }: { phone: string }) {
  const { colors } = useTheme()

  const handleCall = () => {
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir el marcador')
    )
  }

  const handleWhatsApp = () => {
    const cleaned = phone.replace(/\D/g, '')
    Linking.openURL(`https://wa.me/57${cleaned}`).catch(() =>
      Alert.alert('Error', 'No se pudo abrir WhatsApp')
    )
  }

  return (
    <View style={styles.contactActions}>
      <TouchableOpacity
        style={[styles.contactBtn, { backgroundColor: colors.successBg }]}
        onPress={handleCall}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Ionicons name="call" size={14} color={colors.successText} />
        <Text style={[styles.contactBtnText, { color: colors.successText }]}>Llamar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.contactBtn, { backgroundColor: colors.successBg }]}
        onPress={handleWhatsApp}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Ionicons name="logo-whatsapp" size={14} color={colors.successText} />
        <Text style={[styles.contactBtnText, { color: colors.successText }]}>WhatsApp</Text>
      </TouchableOpacity>
    </View>
  )
}

export function RouteStopItem({ stop, isActive, isLast, routeId, onCompleted }: RouteStopItemProps) {
  const { colors } = useTheme()
  const [modalVisible, setModalVisible] = useState(false)

  if (!stop) return null

  const isCompleted = stop.status === 'COMPLETED'
  const isPickup = stop.stop_type === 'PICKUP'

  const handleConfirm = async (data: StopCompletionData) => {
    await onCompleted(stop.id, data)
    setModalVisible(false)
  }

  return (
    <>
      <View style={styles.container}>
        {/* Timeline column */}
        <View style={styles.timelineCol}>
          <StopStatusIcon status={stop.status} />
          {!isLast && (
            <View style={[styles.connector, { backgroundColor: isCompleted ? colors.success : colors.neutral200 }]} />
          )}
        </View>

        {/* Card */}
        <View style={[styles.content, { backgroundColor: colors.surface, shadowColor: colors.black }]}>
          {/* Header row */}
          <View style={styles.header}>
            <View style={[styles.typeBadge, { backgroundColor: isPickup ? colors.warningBg : colors.infoBg }]}>
              <Text style={[styles.typeText, { color: isPickup ? colors.warningText : colors.infoText }]}>
                {isPickup ? 'RECOGIDA' : 'ENTREGA'}
              </Text>
            </View>
            <Text style={[styles.order, { color: colors.neutral500 }]}>#{stop.sequence_order}</Text>
          </View>

          {/* Address */}
          <Text style={[styles.address, { color: colors.neutral900 }]} numberOfLines={2}>
            {stop.address}
          </Text>

          {/* Contact name */}
          {stop.contact_name && (
            <View style={styles.contactNameRow}>
              <Ionicons name="person-outline" size={12} color={colors.neutral400} />
              <Text style={[styles.contactName, { color: colors.neutral500 }]}>{stop.contact_name}</Text>
            </View>
          )}

          {/* Package details */}
          {stop.package_details && (
            <Text style={[styles.packageDetails, { color: colors.neutral400 }]} numberOfLines={1}>
              📦 {stop.package_details}
            </Text>
          )}

          {/* Contact phone actions — always visible if phone exists */}
          {stop.contact_phone && <ContactActions phone={stop.contact_phone} />}

          {/* Complete button — only for active pending stop */}
          {isActive && !isCompleted && (
            <View style={styles.actionRow}>
              <Button
                label={isPickup ? 'Confirmar recogida' : 'Confirmar entrega'}
                onPress={() => setModalVisible(true)}
                size="sm"
                variant={isPickup ? 'outline' : 'primary'}
                fullWidth
              />
            </View>
          )}

          {/* Completion time */}
          {isCompleted && stop.completion_time && (
            <Text style={[styles.completedAt, { color: colors.neutral400 }]}>
              ✓ {new Date(stop.completion_time).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          )}
        </View>
      </View>

      {/* Modal — rendered outside card to avoid clipping */}
      <CompleteStopModal
        stop={stop}
        visible={modalVisible}
        onConfirm={handleConfirm}
        onCancel={() => setModalVisible(false)}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', marginBottom: spacing.sm },
  timelineCol: { alignItems: 'center', width: 28, paddingTop: spacing.xs },
  connector: { width: 2, flex: 1, marginTop: spacing.xs },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  typeBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
  typeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  order: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  address: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, lineHeight: fontSize.sm * 1.4, marginBottom: spacing.xs },
  contactNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  contactName: { fontSize: fontSize.xs },
  packageDetails: { fontSize: fontSize.xs, marginBottom: spacing.xs },
  contactActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs, marginBottom: spacing.xs },
  contactBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.sm },
  contactBtnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  actionRow: { marginTop: spacing.sm },
  completedAt: { fontSize: fontSize.xs, marginTop: spacing.xs },
})
