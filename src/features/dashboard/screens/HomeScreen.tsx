import React from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { Header } from '../components/Header';
import { KPIBox } from '../components/KPIBox';
import { ActiveServiceCard } from '../components/ActiveServiceCard';
import { DailyProgress } from '../components/DailyProgress';
import { useDashboard } from '../hooks/useDashboard';
import type { MainTabParamList } from '@/app/navigation/TabNavigator';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<HomeNav>();
  const { colors } = useTheme();
  const { kpis, activeService, loading, refreshing, error, refresh } = useDashboard();

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalOrders = kpis.pending + kpis.inTransit + kpis.completed;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Header name={user?.name ?? ''} status={user?.operationalStatus ?? 'UNAVAILABLE'} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.kpiRow}>
          <KPIBox label="Pendientes" value={kpis.pending} accent={colors.warning} icon="📋" />
          <KPIBox label="En Ruta" value={kpis.inTransit} accent={colors.primary} icon="🏍️" />
        </View>

        <DailyProgress completed={kpis.completed} total={totalOrders} />

        {activeService ? (
          <View style={styles.activeSection}>
            <ActiveServiceCard
              service={activeService}
              onPress={() => navigation.navigate('Orders')}
              onNavigate={() => navigation.navigate('Orders')}
            />
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, { color: colors.neutral800 }]}>Sin servicio activo</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Orders')} activeOpacity={0.7}>
              <Text style={[styles.emptyLink, { color: colors.primary }]}>
                Ver todos los pedidos
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: spacing.xxxl },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  activeSection: { marginTop: spacing.md },
  emptyCard: {
    margin: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.xxxl,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.md, fontWeight: fontWeight.semibold },
  emptyLink: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: spacing.xs },
});
