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
import { useLocation } from '@/features/tracking/hooks/useLocation';
import type { MainTabParamList } from '@/app/navigation/TabNavigator';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<HomeNav>();
  const { colors } = useTheme();
  const { kpis, activeServices, loading, refreshing, error, refresh } = useDashboard();

  // HomeScreen is always mounted — it owns the foreground tracking lifecycle.
  // Starts the 15s GPS interval + background task when courier is IN_SERVICE.
  // (Previously lived in TrackingScreen which has been removed.)
  const operationalStatus = useAuthStore((s) => s.user?.operationalStatus);
  useLocation({ active: operationalStatus === 'IN_SERVICE' });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const totalOrders = kpis.pending + kpis.inTransit + kpis.completed;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <Header name={user?.name ?? ''} />
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

        {activeServices.length > 0 ? (
          <View style={styles.activeSection}>
            <Text style={[styles.sectionTitle, { color: colors.neutral500 }]}>
              Servicios activos ({activeServices.length})
            </Text>
            {activeServices.map((svc) => (
              <ActiveServiceCard
                key={svc.id}
                service={svc}
                onViewDetails={(serviceId) =>
                  navigation.navigate('Orders', {
                    screen: 'ServiceDetail',
                    params: { serviceId },
                  } as any)
                }
              />
            ))}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface }]}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, { color: colors.neutral800 }]}>Sin servicios activos</Text>
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
  activeSection: { marginTop: spacing.md, gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
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
