import React, { useState, useRef } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert,
  Modal, Pressable,
} from 'react-native';
import type { View as RNView } from 'react-native';
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
type FilterTab = 'assigned' | 'accepted' | 'in_route' | 'completed' | 'history';

const MAIN_TABS: { key: FilterTab; label: string }[] = [
  { key: 'assigned', label: 'Asignados' },
  { key: 'accepted', label: 'Aceptados' },
  { key: 'in_route', label: 'En Ruta' },
];

const MENU_OPTIONS: { key: FilterTab; label: string; icon: string }[] = [
  { key: 'completed', label: 'Completados', icon: '✅' },
  { key: 'history', label: 'Historial', icon: '📋' },
];

const TAB_STATUSES: Record<FilterTab, ServiceStatus[]> = {
  assigned: ['ASSIGNED'],
  accepted: ['ACCEPTED'],
  in_route: ['IN_TRANSIT'],
  completed: ['DELIVERED'],
  history: ['DELIVERED'],
};

const EMPTY_MESSAGES: Record<FilterTab, string> = {
  assigned: 'Sin servicios asignados',
  accepted: 'Sin servicios aceptados',
  in_route: 'Sin servicios en ruta',
  completed: 'Sin entregas completadas',
  history: 'Sin historial disponible',
};

export function ServicesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { services, loading, refreshing, error, refresh, performAction, actionLoading } = useServices();
  const [activeTab, setActiveTab] = useState<FilterTab>('assigned');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, width: 0 });
  const menuBtnRef = useRef<RNView>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const filtered = services.filter((s) => TAB_STATUSES[activeTab].includes(s.status));

  const isMenuTabActive = activeTab === 'completed' || activeTab === 'history';
  const activeMenuLabel = MENU_OPTIONS.find((o) => o.key === activeTab)?.label ?? '···';

  async function handleAction(service: Service) {
    const result = await performAction(service);
    if (!result.ok) Alert.alert('Error', result.error ?? 'No se pudo actualizar el servicio');
  }

  function openMenu() {
    menuBtnRef.current?.measure((_fx: number, _fy: number, width: number, height: number, px: number, py: number) => {
      setMenuAnchor({ x: px, y: py + height, width });
      setMenuVisible(true);
    });
  }

  function selectMenuOption(key: FilterTab) {
    setActiveTab(key);
    setMenuVisible(false);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <Text style={[styles.title, { color: colors.neutral900 }]}>Pedidos del Día</Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>{services.length}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabsWrapper, { backgroundColor: colors.surface }]}>
        <View style={[styles.tabsContainer, { backgroundColor: colors.surfaceRaised }]}>
          {MAIN_TABS.map((tab) => (
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

          {/* Hamburger tab */}
          <TouchableOpacity
            ref={menuBtnRef}
            style={[
              styles.tab,
              styles.menuTab,
              isMenuTabActive && [
                styles.tabActive,
                { backgroundColor: colors.surface, shadowColor: colors.black },
              ],
            ]}
            onPress={openMenu}
            activeOpacity={0.8}
          >
            {isMenuTabActive ? (
              <Text style={[styles.tabText, { color: colors.neutral900, fontWeight: fontWeight.semibold }]}>
                {activeMenuLabel}
              </Text>
            ) : (
              <View style={styles.chevron}>
                <View style={[styles.chevronLeft, { backgroundColor: colors.neutral500 }]} />
                <View style={[styles.chevronRight, { backgroundColor: colors.neutral500 }]} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Service list */}
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

      {/* Dropdown menu */}
      <Modal transparent visible={menuVisible} animationType="fade" onRequestClose={() => setMenuVisible(false)}>
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          <View style={[
            styles.menuDropdown,
            {
              top: menuAnchor.y + spacing.xs,
              right: spacing.lg,
              backgroundColor: colors.surface,
              shadowColor: colors.black,
            },
          ]}>
            {MENU_OPTIONS.map((option, index) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.menuItem,
                  index < MENU_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.neutral200 },
                  activeTab === option.key && { backgroundColor: colors.primaryBg },
                ]}
                onPress={() => selectMenuOption(option.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.menuItemIcon}>{option.icon}</Text>
                <Text style={[
                  styles.menuItemText,
                  { color: colors.neutral800 },
                  activeTab === option.key && { color: colors.primary, fontWeight: fontWeight.semibold },
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
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
  menuTab: { justifyContent: 'center' },
  tabActive: {
    shadowOpacity: 0.07, shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 }, elevation: 2,
  },
  tabText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  // Chevron icon
  chevron: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: fontSize.xs,
  },
  chevronLeft: {
    width: 9, height: 2.5, borderRadius: 2,
    transform: [{ rotate: '45deg' }, { translateY: -1.5 }],
  },
  chevronRight: {
    width: 9, height: 2.5, borderRadius: 2,
    transform: [{ rotate: '-45deg' }, { translateY: -1.5 }],
    marginLeft: -3,
  },
  // Dropdown
  menuOverlay: { flex: 1 },
  menuDropdown: {
    position: 'absolute',
    minWidth: 160,
    borderRadius: borderRadius.md,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  menuItemIcon: { fontSize: 16 },
  menuItemText: { fontSize: fontSize.sm },
  // List
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: fontSize.sm },
});
