import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { StatusBadge } from '../components/StatusBadge';
import { useServiceDetail, canTransition, nextStatus } from '../hooks/useServices';
import { useTrackingCoords } from '@/features/tracking/hooks/useLocation';
import { EvidenceCapture } from '@/features/evidence/components/EvidenceCapture';
import { CourierServiceMap } from '../components/CourierServiceMap';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';
import type { PaymentStatus } from '../types/services.types';

type Route = NativeStackScreenProps<ServicesStackParamList, 'ServiceDetail'>['route'];

const ACTION_LABEL: Record<string, string> = {
  ACCEPTED: 'Aceptar servicio',
  IN_TRANSIT: 'Iniciar ruta',
  DELIVERED: 'Finalizar entrega',
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PAID: 'Pagado',
  UNPAID: 'No pagado',
};

export function ServiceDetailScreen() {
  const route = useRoute<Route>();
  const { serviceId } = route.params;
  const { colors } = useTheme();
  const {
    service,
    isLoading: detailLoading,
    isError: detailError,
    performAction,
    actionLoading,
    performPaymentAction,
    paymentLoading,
  } = useServiceDetail(serviceId);

  const [localError, setLocalError] = useState<string | null>(null);
  const [evidenceUploaded, setEvidenceUploaded] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const { latitude, longitude, permissionDenied } = useTrackingCoords();

  if (detailLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (detailError || !service) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.neutral400 }]}>Servicio no encontrado</Text>
      </SafeAreaView>
    );
  }

  const next = nextStatus(service.status);
  const canAct = canTransition(service.status);
  const isLoading = actionLoading === service.id;
  const needsEvidence = service.status === 'IN_TRANSIT';
  const actionBlocked = needsEvidence && !evidenceUploaded;

  const handleAction = async () => {
    setLocalError(null);
    const result = await performAction(service);
    if (!result.ok) {
      setLocalError(result.error ?? 'Error desconocido');
      Alert.alert('Error', result.error ?? 'No se pudo actualizar el servicio');
      return;
    }
    if (next === 'DELIVERED') setShowPaymentModal(true);
  };

  const handlePayment = async (status: PaymentStatus) => {
    setShowPaymentModal(false);
    const result = await performPaymentAction(service.id, status);
    if (!result.ok) Alert.alert('Aviso', result.error ?? 'No se pudo actualizar el estado de pago');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.statusRow}>
          <StatusBadge status={service.status} />
        </View>

        {/* Map — shown when service has geocoded coordinates */}
        {service.origin_lat != null && service.destination_lat != null && (
          <CourierServiceMap
            originLat={Number(service.origin_lat)}
            originLng={Number(service.origin_lng!)}
            originAddress={service.origin_address}
            destinationLat={Number(service.destination_lat)}
            destinationLng={Number(service.destination_lng!)}
            destinationAddress={service.destination_address}
            courierLat={latitude}
            courierLng={longitude}
          />
        )}

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Row label="Origen" value={service.origin_address} colors={colors} />
          <Row label="Destino" value={service.destination_address} colors={colors} />
          <Row label="Destinatario" value={service.destination_name} colors={colors} />
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.neutral500 }]}>Paquete</Text>
          <Row label="Detalle" value={service.package_details} colors={colors} />
          <Row label="Método de pago" value={PAYMENT_METHOD_LABEL[service.payment_method] ?? service.payment_method} colors={colors} />
          <Row
            label="Estado de pago"
            value={PAYMENT_STATUS_LABEL[service.payment_status] ?? service.payment_status}
            highlight={service.payment_status === 'UNPAID'}
            colors={colors}
          />
          {service.notes_observations ? (
            <Row label="Notas" value={service.notes_observations} colors={colors} />
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.neutral500 }]}>Valores</Text>
          <Row label="Domicilio" value={`${service.delivery_price.toFixed(2)}`} colors={colors} />
          <Row label="Producto" value={`${service.product_price.toFixed(2)}`} colors={colors} />
          <Row label="Total" value={`${service.total_price.toFixed(2)}`} highlight colors={colors} />
        </View>

        {needsEvidence ? (
          <EvidenceCapture serviceId={service.id} onUploaded={() => setEvidenceUploaded(true)} />
        ) : null}

        {localError ? (
          <Text style={[styles.errorText, { color: colors.danger }]}>{localError}</Text>
        ) : null}
      </ScrollView>

      {canAct && next ? (
        <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.neutral200 }]}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.primary },
              (isLoading || actionBlocked) && styles.actionBtnDisabled,
            ]}
            onPress={handleAction}
            disabled={isLoading || actionBlocked}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={[styles.actionBtnText, { color: colors.white }]}>
                {actionBlocked ? 'Sube la evidencia primero' : ACTION_LABEL[next]}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      <PaymentModal
        visible={showPaymentModal}
        loading={paymentLoading}
        currentStatus={service.payment_status}
        totalPrice={service.total_price}
        onSelect={handlePayment}
        onDismiss={() => setShowPaymentModal(false)}
        colors={colors}
      />
    </SafeAreaView>
  );
}

// ── Row ───────────────────────────────────────────────────────────────────────

function Row({ label, value, highlight, colors }: {
  label: string; value: string; highlight?: boolean; colors: any;
}) {
  return (
    <View style={[styles.rowContainer, { borderBottomColor: colors.neutral100 }]}>
      <Text style={[styles.rowLabel, { color: colors.neutral500 }]}>{label}</Text>
      <Text style={[
        styles.rowValue,
        { color: highlight ? colors.danger : colors.neutral800 },
        highlight && { fontWeight: fontWeight.bold },
      ]}>
        {value}
      </Text>
    </View>
  );
}

// ── Payment Modal ─────────────────────────────────────────────────────────────

function PaymentModal({ visible, loading, currentStatus, totalPrice, onSelect, onDismiss, colors }: {
  visible: boolean; loading: boolean; currentStatus: PaymentStatus;
  totalPrice: number; onSelect: (s: PaymentStatus) => void; onDismiss: () => void; colors: any;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <View style={[modalStyles.overlay, { backgroundColor: colors.black + '73' }]}>
        <View style={[modalStyles.sheet, { backgroundColor: colors.surface }]}>
          <Text style={[modalStyles.title, { color: colors.neutral800 }]}>¿Te pagaron el servicio?</Text>
          <Text style={[modalStyles.subtitle, { color: colors.neutral500 }]}>
            Total: <Text style={{ fontWeight: fontWeight.bold, color: colors.neutral800 }}>${totalPrice.toFixed(2)}</Text>
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
          ) : (
            <View style={modalStyles.buttons}>
              <TouchableOpacity
                style={[modalStyles.btn, { backgroundColor: colors.success }]}
                onPress={() => onSelect('PAID')}
                activeOpacity={0.85}
              >
                <Text style={[modalStyles.btnText, { color: colors.white }]}>Sí, me pagaron</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.btn, { backgroundColor: colors.danger }]}
                onPress={() => onSelect('UNPAID')}
                activeOpacity={0.85}
              >
                <Text style={[modalStyles.btnText, { color: colors.white }]}>No me pagaron</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modalStyles.btnSkip} onPress={onDismiss} activeOpacity={0.7}>
                <Text style={[modalStyles.btnSkipText, { color: colors.neutral400 }]}>
                  Mantener estado actual ({PAYMENT_STATUS_LABEL[currentStatus]})
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  statusRow: { marginBottom: spacing.lg },
  section: { borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm,
  },
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, borderTopWidth: 1,
  },
  actionBtn: { borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.6 },
  actionBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  notFound: { textAlign: 'center', marginTop: 60 },
  errorText: { fontSize: fontSize.sm, textAlign: 'center', marginTop: spacing.sm },
  rowContainer: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: spacing.sm, borderBottomWidth: 1,
  },
  rowLabel: { fontSize: fontSize.sm },
  rowValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, flex: 1, textAlign: 'right' },
});

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.xxl, paddingBottom: 40 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: { fontSize: fontSize.sm, textAlign: 'center', marginBottom: spacing.xxl },
  buttons: { gap: spacing.md },
  btn: { borderRadius: borderRadius.md, paddingVertical: 14, alignItems: 'center' },
  btnText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  btnSkip: { paddingVertical: spacing.md, alignItems: 'center' },
  btnSkipText: { fontSize: fontSize.sm },
});
