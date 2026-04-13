import React from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { shadows } from '@/shared/ui/shadows';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { useEarnings } from '../hooks/useEarnings';
import type { Liquidation } from '../api/earningsApi';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }).toUpperCase();
}

function StatChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={[statStyles.chip, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
      <Text style={statStyles.icon}>{icon}</Text>
      <Text style={[statStyles.label, { color: colors.neutral500 }]}>{label}</Text>
      <Text style={[statStyles.value, { color: colors.neutral900 }]}>{value}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  chip: { flex: 1, borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center', gap: spacing.xs },
  icon: { fontSize: 22 },
  label: { fontSize: fontSize.xs },
  value: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});

function IncomeRow({ icon, title, subtitle, amount, positive }: {
  icon: string; title: string; subtitle: string; amount: string; positive?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={[rowStyles.container, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
      <View style={[rowStyles.iconWrap, { backgroundColor: colors.neutral100 }]}>
        <Text style={rowStyles.icon}>{icon}</Text>
      </View>
      <View style={rowStyles.info}>
        <Text style={[rowStyles.title, { color: colors.neutral800 }]}>{title}</Text>
        <Text style={[rowStyles.subtitle, { color: colors.neutral500 }]}>{subtitle}</Text>
      </View>
      <Text style={[rowStyles.amount, { color: positive ? colors.success : colors.danger }]}>{amount}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  iconWrap: { width: 44, height: 44, borderRadius: borderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  title: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  subtitle: { fontSize: fontSize.xs, marginTop: 2 },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});

function LiquidationRow({ item }: { item: Liquidation }) {
  const { colors } = useTheme();
  return (
    <View style={[histStyles.row, { backgroundColor: colors.surface, shadowColor: colors.black }, shadows.sm]}>
      <View style={histStyles.left}>
        <Text style={[histStyles.date, { color: colors.neutral800 }]}>
          {formatDate(item.start_date)} — {formatDate(item.end_date)}
        </Text>
        <Text style={[histStyles.services, { color: colors.neutral500 }]}>{item.total_services} servicios</Text>
      </View>
      <Text style={[histStyles.amount, { color: colors.success }]}>
        ${item.total_earned.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </Text>
    </View>
  );
}

const histStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: borderRadius.md, padding: spacing.md, marginBottom: spacing.sm },
  left: { gap: 3 },
  date: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  services: { fontSize: fontSize.xs },
  amount: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});

export function EarningsScreen() {
  const { colors } = useTheme();
  const { summary, liquidations, loading, refreshing, error, refresh } = useEarnings();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalEarned = summary?.total_earned ?? 0;
  const totalServices = summary?.total_services ?? 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.neutral100 }]}>
        <Text style={[styles.headerTitle, { color: colors.neutral900 }]}>Liquidación del Día</Text>
        <TouchableOpacity style={[styles.calendarBtn, { backgroundColor: colors.neutral100 }]} activeOpacity={0.7}>
          <Text style={styles.calendarIcon}>📅</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={liquidations}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <View style={[styles.heroCard, { backgroundColor: colors.primary, shadowColor: colors.primary }, shadows.primary]}>
              <Text style={[styles.heroLabel, { color: colors.white, opacity: 0.8 }]}>Total a Pagar</Text>
              <Text style={[styles.heroAmount, { color: colors.white }]}>
                ${totalEarned.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
              </Text>
              <View style={[styles.heroBadge, { backgroundColor: colors.primaryDark }]}>
                <Text style={[styles.heroBadgeText, { color: colors.white }]}>📈 +12% vs ayer</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <StatChip icon="🚚" label="Pedidos" value={String(totalServices)} />
              <StatChip icon="⏱" label="Tiempo" value="6.5h" />
              <StatChip icon="📍" label="Distancia" value="42km" />
            </View>

            <Text style={[styles.sectionTitle, { color: colors.neutral900 }]}>Ingresos</Text>
            <IncomeRow icon="🏍" title="Tarifa Base" subtitle={`${totalServices} entregas`} amount={`$${(totalEarned * 0.72).toFixed(2)}`} positive />
            <IncomeRow icon="👍" title="Propinas" subtitle="100% tuyas" amount={`+$${(totalEarned * 0.16).toFixed(2)}`} positive />
            <IncomeRow icon="🌧" title="Bono por Lluvia" subtitle="Zona Norte" amount={`+$${(totalEarned * 0.12).toFixed(2)}`} positive />

            <Text style={[styles.sectionTitle, { color: colors.neutral900 }]}>Deducciones</Text>
            <IncomeRow icon="💵" title="Efectivo Recibido" subtitle="Pago en mano de clientes" amount="-$4.50" positive={false} />

            {liquidations.length > 0 && (
              <Text style={[styles.sectionTitle, { color: colors.neutral900 }]}>Historial de liquidaciones</Text>
            )}
          </>
        }
        renderItem={({ item }) => <LiquidationRow item={item} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={[styles.emptyText, { color: colors.neutral400 }]}>Sin liquidaciones registradas</Text>
          </View>
        }
      />

      <View style={[styles.ctaContainer, { backgroundColor: colors.surface, borderTopColor: colors.neutral100 }]}>
        <TouchableOpacity style={[styles.ctaBtn, { backgroundColor: colors.primary, shadowColor: colors.primary }, shadows.primary]} activeOpacity={0.85}>
          <Text style={[styles.ctaText, { color: colors.white }]}>Transferir a mi Cuenta →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  calendarBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calendarIcon: { fontSize: 18 },
  heroCard: { margin: spacing.lg, borderRadius: borderRadius.xl, padding: spacing.xxl, alignItems: 'center' },
  heroLabel: { fontSize: fontSize.sm, marginBottom: spacing.sm },
  heroAmount: { fontSize: fontSize.xxxl, fontWeight: fontWeight.extrabold, marginBottom: spacing.md },
  heroBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  heroBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  statsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm, marginBottom: spacing.lg },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, paddingHorizontal: spacing.lg, marginBottom: spacing.sm, marginTop: spacing.sm },
  list: { paddingBottom: 100 },
  empty: { alignItems: 'center', marginTop: spacing.xxxl, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm },
  ctaContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg, borderTopWidth: 1 },
  ctaBtn: { borderRadius: borderRadius.lg, paddingVertical: 15, alignItems: 'center' },
  ctaText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
});
