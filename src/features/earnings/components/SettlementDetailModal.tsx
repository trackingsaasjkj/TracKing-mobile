import React, { useEffect, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { servicesApi } from '@/features/services/api/servicesApi';
import type { Service } from '@/features/services/types/services.types';
import type { Settlement } from '../api/earningsApi';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  return `${fmt(start)} — ${fmt(end)}`;
}

/** Returns true if the service's delivery_date falls within [start, end] */
function isInRange(service: Service, start: string, end: string): boolean {
  const d = service.delivery_date;
  if (!d) return false;
  const ts = new Date(d).getTime();
  return ts >= new Date(start).getTime() && ts <= new Date(end).getTime();
}

const PAYMENT_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CREDIT: 'Crédito',
};

// ─── Service item ─────────────────────────────────────────────────────────────

function ServiceItem({ item, index }: { item: Service; index: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        itemStyles.container,
        { backgroundColor: colors.background, borderColor: colors.neutral200 },
      ]}
    >
      <View style={itemStyles.header}>
        <View style={[itemStyles.numBadge, { backgroundColor: colors.primaryBg }]}>
          <Text style={[itemStyles.num, { color: colors.primary }]}>#{index + 1}</Text>
        </View>
        <View style={itemStyles.headerInfo}>
          <Text style={[itemStyles.dest, { color: colors.neutral800 }]} numberOfLines={1}>
            {item.destination_address}
          </Text>
          <Text style={[itemStyles.date, { color: colors.neutral500 }]}>
            {formatDate(item.delivery_date ?? null)}
          </Text>
        </View>
        <Text style={[itemStyles.price, { color: colors.success }]}>
          {formatCurrency(item.delivery_price)}
        </Text>
      </View>

      <View style={[itemStyles.divider, { backgroundColor: colors.neutral200 }]} />

      <View style={itemStyles.meta}>
        <Text style={[itemStyles.metaText, { color: colors.neutral500 }]}>
          📍 {item.origin_address}
        </Text>
        <Text style={[itemStyles.metaText, { color: colors.neutral500 }]}>
          👤 {item.destination_name} · {PAYMENT_LABEL[item.payment_method] ?? item.payment_method}
        </Text>
      </View>
    </View>
  );
}

const itemStyles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  numBadge: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  headerInfo: { flex: 1 },
  dest: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  date: { fontSize: fontSize.xs, marginTop: 1 },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  divider: { height: 1, marginVertical: spacing.sm },
  meta: { gap: 3 },
  metaText: { fontSize: fontSize.xs },
});

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  settlement: Settlement | null;
  visible: boolean;
  onClose: () => void;
}

export function SettlementDetailModal({ settlement, visible, onClose }: Props) {
  const { colors } = useTheme();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async (s: Settlement) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all delivered services page by page until we cover the settlement range
      let page = 1;
      const limit = 50;
      const collected: Service[] = [];

      while (true) {
        const res = await servicesApi.getHistory(page, limit, 'DELIVERED');
        const inRange = res.data.filter((svc) => isInRange(svc, s.start_date, s.end_date));
        collected.push(...inRange);

        // Stop if we've passed the start_date (items are ordered desc by delivery_date)
        const lastItem = res.data[res.data.length - 1];
        const reachedBefore =
          lastItem?.delivery_date &&
          new Date(lastItem.delivery_date).getTime() < new Date(s.start_date).getTime();

        if (reachedBefore || res.data.length < limit || page * limit >= res.total) break;
        page++;
      }

      // Sort ascending by delivery_date for display
      collected.sort((a, b) => {
        const ta = a.delivery_date ? new Date(a.delivery_date).getTime() : 0;
        const tb = b.delivery_date ? new Date(b.delivery_date).getTime() : 0;
        return ta - tb;
      });

      setServices(collected);
    } catch (err: any) {
      setError(err?.userMessage ?? 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible && settlement) {
      fetchServices(settlement);
    } else {
      setServices([]);
      setError(null);
    }
  }, [visible, settlement, fetchServices]);

  if (!settlement) return null;

  const avgPerService =
    services.length > 0
      ? services.reduce((acc, s) => acc + s.delivery_price, 0) / services.length
      : 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.neutral200 }]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.neutral900 }]}>
              Detalle de liquidación
            </Text>
            <Text style={[styles.headerSub, { color: colors.neutral500 }]}>
              {formatDateRange(settlement.start_date, settlement.end_date)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.neutral100 }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.closeIcon, { color: colors.neutral600 }]}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* ── Summary strip ── */}
        <View style={[styles.strip, { backgroundColor: colors.primary }]}>
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: colors.white }]}>
              {formatCurrency(settlement.courier_payment)}
            </Text>
            <Text style={[styles.stripLabel, { color: colors.white }]}>Total ganado</Text>
          </View>
          <View style={[styles.stripSep, { backgroundColor: colors.primaryLight }]} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: colors.white }]}>
              {settlement.total_services}
            </Text>
            <Text style={[styles.stripLabel, { color: colors.white }]}>Servicios</Text>
          </View>
          <View style={[styles.stripSep, { backgroundColor: colors.primaryLight }]} />
          <View style={styles.stripItem}>
            <Text style={[styles.stripValue, { color: colors.white }]}>
              {formatCurrency(avgPerService)}
            </Text>
            <Text style={[styles.stripLabel, { color: colors.white }]}>Promedio/servicio</Text>
          </View>
        </View>

        {/* ── Services list ── */}
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.neutral500 }]}>
              Cargando servicios...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={[styles.errorText, { color: colors.neutral500 }]}>{error}</Text>
            <TouchableOpacity
              onPress={() => fetchServices(settlement)}
              style={[styles.retryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.retryText, { color: colors.white }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={services}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => <ServiceItem item={item} index={index} />}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              services.length > 0 ? (
                <Text style={[styles.listTitle, { color: colors.neutral900 }]}>
                  Pedidos en este período ({services.length})
                </Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.center}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={[styles.emptyText, { color: colors.neutral500 }]}>
                  No se encontraron servicios en el historial para este período.
                </Text>
              </View>
            }
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  headerSub: { fontSize: fontSize.xs, marginTop: 2 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  strip: {
    flexDirection: 'row',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  stripItem: { flex: 1, alignItems: 'center', gap: 3 },
  stripValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  stripLabel: { fontSize: fontSize.xs, opacity: 0.8 },
  stripSep: { width: 1, marginHorizontal: spacing.sm, opacity: 0.3 },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  listTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.md,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxxl,
    gap: spacing.md,
  },
  loadingText: { fontSize: fontSize.sm },
  errorIcon: { fontSize: 32 },
  errorText: { fontSize: fontSize.sm, textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  retryText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
