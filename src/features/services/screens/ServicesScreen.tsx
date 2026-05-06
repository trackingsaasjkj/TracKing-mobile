import React, { useRef, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Alert,
  Modal, Pressable,
} from 'react-native';
import type { View as RNView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { spacing, borderRadius } from '@/shared/ui/spacing';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { ErrorState } from '@/shared/components/ErrorState';
import { ServiceCard } from '../components/ServiceCard';
import { useServices, canTransition } from '../hooks/useServices';
import type { Service } from '../types/services.types';
import type { ServicesStackParamList } from '../navigation/ServicesNavigator';

type Nav = NativeStackNavigationProp<ServicesStackParamList, 'ServicesList'>;

type MenuKey = 'completed' | 'history';

const MENU_OPTIONS: { key: MenuKey; label: string; iconName: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'completed', label: 'Completados', iconName: 'checkmark-circle-outline' },
  { key: 'history',   label: 'Historial',   iconName: 'time-outline' },
];

export function ServicesScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useTheme();
  const { services, loading, refreshing, error, refresh, performAction, actionLoading } = useServices();
  const [menuVisible, setMenuVisible] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState({ x: 0, y: 0, width: 0 });
  const menuBtnRef = useRef<RNView>(null);

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const activeServices = showCompleted
    ? services.filter((s) => s.status === 'DELIVERED')
    : services.filter((s) => s.status !== 'DELIVERED');

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

  function selectMenuOption(key: MenuKey) {
    setMenuVisible(false);
    if (key === 'history') { navigation.navigate('ServiceHistory'); return; }
    if (key === 'completed') setShowCompleted((prev) => !prev);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        {showCompleted ? (
          <>
            <TouchableOpacity onPress={() => setShowCompleted(false)} activeOpacity={0.7} style={styles.backBtn}>
              <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
              <Text style={[styles.backText, { color: colors.primary }]}>Pedidos</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.neutral900 }]}>Completados</Text>
            <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
              <Text style={[styles.countText, { color: colors.primary }]}>{activeServices.length}</Text>
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.title, { color: colors.neutral900 }]}>Pedidos del Día</Text>
            <View style={styles.headerRight}>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
                <Text style={[styles.countText, { color: colors.primary }]}>{activeServices.length}</Text>
              </View>
              <TouchableOpacity
                ref={menuBtnRef}
                onPress={openMenu}
                activeOpacity={0.8}
                style={styles.menuBtn}
              >
                <View style={[styles.burgerLine, { backgroundColor: colors.neutral600 }]} />
                <View style={[styles.burgerLine, { backgroundColor: colors.neutral600 }]} />
                <View style={[styles.burgerLine, { backgroundColor: colors.neutral600 }]} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Service list */}
      <FlatList
        data={activeServices}
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
            <Ionicons name="cube-outline" size={40} color={colors.neutral400} />
            <Text style={[styles.emptyText, { color: colors.neutral400 }]}>
              {showCompleted ? 'Sin pedidos completados hoy' : 'Sin pedidos activos'}
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
                  option.key === 'completed' && showCompleted && { backgroundColor: colors.primaryBg },
                ]}
                onPress={() => selectMenuOption(option.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={option.iconName}
                  size={16}
                  color={option.key === 'completed' && showCompleted ? colors.primary : colors.neutral600}
                />
                <Text style={[
                  styles.menuItemText,
                  { color: option.key === 'completed' && showCompleted ? colors.primary : colors.neutral800 },
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  countBadge: { borderRadius: borderRadius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  countText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  menuBtn: { padding: spacing.xs, gap: 4, justifyContent: 'center' },
  burgerLine: { width: 20, height: 2, borderRadius: 2 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backIcon: { fontSize: 28, lineHeight: 30, marginTop: -2 },
  backText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
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
  menuItemText: { fontSize: fontSize.sm },
  // List
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  empty: { alignItems: 'center', paddingTop: spacing.huge, gap: spacing.md },
  emptyText: { fontSize: fontSize.sm },
});
