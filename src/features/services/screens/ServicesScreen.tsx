import React, { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { ServiceCard } from '../components/ServiceCard';
import { useServices, canTransition } from '../hooks/useServices';
import type { Service, ServiceStatus } from '../types/services.types';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServicesList'>;
type FilterTab = 'all' | 'pending' | 'active' | 'completed';

const TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'pending', label: 'Pendientes' },
  { key: 'active', label: 'En Ruta' },
  { key: 'completed', label: 'Completados' },
];

const TAB_STATUSES: Record<FilterTab, ServiceStatus[]> = {
  all: ['ASSIGNED', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED'],
  pending: ['ASSIGNED'],
  active: ['ACCEPTED', 'IN_TRANSIT'],
  completed: ['DELIVERED'],
};

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  all: 'Sin servicios asignados',
  pending: 'Sin pedidos pendientes',
  active: 'Sin servicios en ruta',
  completed: 'Sin entregas completadas',
};

export function ServicesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { services, loading, refreshing, error, refresh, performAction, actionLoading } = useServices();
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const filtered = services.filter((s) => TAB_STATUSES[activeTab].includes(s.status));

  async function handleAction(service: Service) {
    const result = await performAction(service);
    if (!result.ok) Alert.alert('Error', result.error ?? 'No se pudo actualizar el servicio');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.neutral900 }]}>Pedidos del Día</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{services.length}</Text>
        </View>
      </View>

      <View style={[styles.tabsWrapper, { backgroundColor: colors.surface }]}>
        <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceRaised }]}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && [
                  styles.tabActive,
                  { backgroundColor: colors.surface, shadowColor: colors.black },
                ],
              ]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.tabText,
                { color: colors.neutral500 },
                activeTab === tab.key && { color: colors.neutral900, fontWeight: fontWeight.semibold },
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ServiceCard
            service={item}
            onPress={() => navigation.navigate('ServiceDetail', { serviceId: item.id })}
            onAction={canTransition(item.status) ? () => handleAction(item) : undefined}
            actionLoading={actionLoading === item.id}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, { color: colors.neutral400 }]}>
              {EMPTY_MESSAGES[activeTab]}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  countBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  countText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  tabsWrapper: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  tabsContainer: { flexDirection: 'row', borderRadius: borderRadius.lg, padding: 3 },
  tab: { flex: 1, paddingVertical: spacing.sm, alignItems: 'center', borderRadius: borderRadius.md },
  tabActive: {
    shadowOpacity: 0.07, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  tabText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm },
});
