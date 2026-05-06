import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { useEarnings } from '../hooks/useEarnings';
import { SettlementDetailModal } from '../components/SettlementDetailModal';
import type { Settlement } from '../api/earningsApi';

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return value.toLocaleString('es-MX', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

function formatDateRange(start: string, end: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  return `${fmt(start)} — ${fmt(end)}`;
}

function formatFullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryCard({
  totalEarned,
  totalServices,
  totalSettlements,
  lastSettlement,
}: {
  totalEarned: number;
  totalServices: number;
  totalSettlements: number;
  lastSettlement: Settlement | null;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        summaryStyles.card,
        { backgroundColor: colors.primary, shadowColor: colors.primary },
        shadows.primary,
      ]}
    >
      {/* Primary: última liquidación */}
      <Text style={[summaryStyles.label, { color: colors.white }]}>
        {lastSettlement
          ? `Última liquidación · ${formatDateRange(lastSettlement.start_date, lastSettlement.end_date)}`
          : 'Sin liquidaciones aún'}
      </Text>
      <Text style={[summaryStyles.amount, { color: colors.white }]}>
        {formatCurrency(lastSettlement?.total_earned ?? 0)}
      </Text>

      {lastSettlement && (
        <View style={[summaryStyles.pill, { backgroundColor: colors.primaryDark }]}>
          <Text style={[summaryStyles.pillText, { color: colors.white }]}>
            {lastSettlement.total_services} servicios en este período
          </Text>
        </View>
      )}

      {/* Secondary: acumulado histórico */}
      <View style={[summaryStyles.divider, { borderTopColor: colors.primaryLight }]} />
      <View style={summaryStyles.accRow}>
        <View style={summaryStyles.accItem}>
          <Text style={[summaryStyles.accValue, { color: colors.white }]}>
            {formatCurrency(totalEarned)}
          </Text>
          <Text style={[summaryStyles.accLabel, { color: colors.white }]}>Total histórico</Text>
        </View>
        <View style={[summaryStyles.accSep, { backgroundColor: colors.primaryLight }]} />
        <View style={summaryStyles.accItem}>
          <Text style={[summaryStyles.accValue, { color: colors.white }]}>
            {totalServices}
          </Text>
          <Text style={[summaryStyles.accLabel, { color: colors.white }]}>Servicios totales</Text>
        </View>
        <View style={[summaryStyles.accSep, { backgroundColor: colors.primaryLight }]} />
        <View style={summaryStyles.accItem}>
          <Text style={[summaryStyles.accValue, { color: colors.white }]}>
            {totalSettlements}
          </Text>
          <Text style={[summaryStyles.accLabel, { color: colors.white }]}>Liquidaciones</Text>
        </View>
      </View>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    margin: spacing.lg,
    borderRadius: borderRadius.xl,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: { fontSize: fontSize.sm, opacity: 0.85 },
  amount: { fontSize: fontSize.xxxl, fontWeight: fontWeight.extrabold },
  pill: {
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pillText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  divider: {
    width: '100%',
    borderTopWidth: 1,
    marginTop: spacing.sm,
    opacity: 0.4,
  },
  accRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  accItem: { alignItems: 'center', gap: 2, flex: 1 },
  accValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  accLabel: { fontSize: fontSize.xs, opacity: 0.75, textAlign: 'center' },
  accSep: { width: 1, height: 28, opacity: 0.3 },
});

// ─── KPI chips ───────────────────────────────────────────────────────────────

function KpiChip({ iconName, label, value }: { iconName: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        kpiStyles.chip,
        { backgroundColor: colors.surface, shadowColor: colors.black },
        shadows.sm,
      ]}
    >
      <Ionicons name={iconName} size={20} color={colors.primary} />
      <Text style={[kpiStyles.value, { color: colors.neutral900 }]}>{value}</Text>
      <Text style={[kpiStyles.label, { color: colors.neutral500 }]}>{label}</Text>
    </View>
  );
}

const kpiStyles = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  label: { fontSize: fontSize.xs, textAlign: 'center' },
});

// ─── Settlement row ───────────────────────────────────────────────────────────

function SettlementRow({ item, index, onPress }: { item: Settlement; index: number; onPress: () => void }) {
  const { colors } = useTheme();
  const avgPerService =
    item.total_services > 0 ? item.total_earned / item.total_services : 0;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        rowStyles.container,
        { backgroundColor: colors.surface, shadowColor: colors.black },
        shadows.sm,
      ]}
    >
      {/* Left: index badge + dates */}
      <View style={[rowStyles.badge, { backgroundColor: colors.primaryBg }]}>
        <Text style={[rowStyles.badgeNum, { color: colors.primary }]}>#{index + 1}</Text>
      </View>

      <View style={rowStyles.info}>
        <Text style={[rowStyles.dateRange, { color: colors.neutral800 }]}>
          {formatDateRange(item.start_date, item.end_date)}
        </Text>
        <Text style={[rowStyles.meta, { color: colors.neutral500 }]}>
          {item.total_services} servicios · ~{formatCurrency(avgPerService)} c/u
        </Text>
      </View>

      <View style={rowStyles.right}>
        <Text style={[rowStyles.amount, { color: colors.success }]}>
          {formatCurrency(item.total_earned)}
        </Text>
        <Text style={[rowStyles.chevron, { color: colors.neutral400 }]}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  badge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeNum: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  info: { flex: 1, gap: 3 },
  dateRange: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.xs },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  chevron: { fontSize: fontSize.xl, fontWeight: fontWeight.bold },
});

// ─── Incentives placeholder ───────────────────────────────────────────────────

function IncentivesPlaceholder() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        incStyles.card,
        { backgroundColor: colors.surface, borderColor: colors.neutral200, shadowColor: colors.black },
        shadows.sm,
      ]}
    >
      <Ionicons name="trophy-outline" size={28} color={colors.primary} />
      <Text style={[incStyles.title, { color: colors.neutral800 }]}>Incentivos y objetivos</Text>
      <Text style={[incStyles.desc, { color: colors.neutral500 }]}>
        Próximamente podrás ver tus metas activas y el progreso hacia bonificaciones especiales.
      </Text>
    </View>
  );
}

const incStyles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  desc: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});

// ─── Section title ────────────────────────────────────────────────────────────

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();
  return (
    <View style={secStyles.container}>
      <Text style={[secStyles.title, { color: colors.neutral900 }]}>{title}</Text>
      {subtitle && (
        <Text style={[secStyles.subtitle, { color: colors.neutral500 }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const secStyles = StyleSheet.create({
  container: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  subtitle: { fontSize: fontSize.xs, marginTop: 2 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export function EarningsScreen() {
  const { colors } = useTheme();
  const { summary, liquidations, loading, refreshing, error, refresh } = useEarnings();
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalEarned = summary?.total_earned ?? 0;
  const totalServices = summary?.total_services ?? 0;
  const totalSettlements = summary?.total_settlements ?? 0;

  // Most recent settlement = last in array (sorted by created_at desc from API)
  const lastSettlement = liquidations.length > 0 ? liquidations[0] : null;
  const avgPerSettlement =
    totalSettlements > 0 ? totalEarned / totalSettlements : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* ── Top bar ── */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.surface, borderBottomColor: colors.neutral200 },
        ]}
      >
        <Text style={[styles.topTitle, { color: colors.neutral900 }]}>Mis Ganancias</Text>
      </View>

      <FlatList
        data={liquidations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* 1. Summary hero */}
            <SummaryCard
              totalEarned={totalEarned}
              totalServices={totalServices}
              totalSettlements={totalSettlements}
              lastSettlement={lastSettlement}
            />

            {/* 2. KPI chips */}
            <View style={styles.kpiRow}>
              <KpiChip iconName="receipt-outline"   label="Liquidaciones"  value={String(totalSettlements)} />
              <KpiChip iconName="bicycle-outline"   label="Servicios"      value={String(totalServices)} />
              <KpiChip iconName="wallet-outline"    label="Promedio/liq."  value={formatCurrency(avgPerSettlement)} />
            </View>

            {/* 3. Incentives placeholder */}
            <View style={styles.section}>
              <IncentivesPlaceholder />
            </View>

            {/* 4. History header */}
            {liquidations.length > 0 && (
              <SectionTitle
                title="Historial de liquidaciones"
                subtitle="Cada liquidación agrupa un período de servicios completados"
              />
            )}
          </>
        }
        renderItem={({ item, index }) => (
          <View style={styles.rowWrapper}>
            <SettlementRow
              item={item}
              index={index}
              onPress={() => setSelectedSettlement(item)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="bar-chart-outline" size={44} color={colors.neutral400} />
            <Text style={[styles.emptyTitle, { color: colors.neutral800 }]}>
              Sin liquidaciones aún
            </Text>
            <Text style={[styles.emptyDesc, { color: colors.neutral500 }]}>
              Tus liquidaciones aparecerán aquí una vez que la empresa las procese.
            </Text>
          </View>
        }
      />

      <SettlementDetailModal
        settlement={selectedSettlement}
        visible={selectedSettlement !== null}
        onClose={() => setSelectedSettlement(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  topTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  listContent: { paddingBottom: spacing.xxxl },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  rowWrapper: {
    paddingHorizontal: spacing.lg,
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    marginTop: spacing.xxxl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  emptyDesc: { fontSize: fontSize.sm, textAlign: 'center', lineHeight: 20 },
});
