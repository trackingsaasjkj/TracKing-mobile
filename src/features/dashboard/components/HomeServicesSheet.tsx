import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/shared/ui/useTheme';
import { fontSize, fontWeight } from '@/shared/ui/typography';
import { borderRadius, spacing } from '@/shared/ui/spacing';
import { BottomSheet } from '@/shared/ui/components/BottomSheet';
import { canTransition } from '@/features/services/hooks/useServices';
import type { Service } from '@/features/services/types/services.types';
import { SheetServiceItem } from './SheetServiceItem';

export const HOME_SHEET_COLLAPSED_HEIGHT = 208;

interface ActiveRouteSummary {
  routeId: string;
  totalStops: number;
  completedStops: number;
}

interface HomeServicesSheetProps {
  activeRoute: ActiveRouteSummary | null;
  services: Service[];
  selectedId: string | null;
  selectedRouteId: string | null;
  selectedService: Service | null;
  routeLoading: boolean;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  actionLoadingId: string | null;
  onRefresh: () => void;
  onSelectService: (serviceId: string) => void;
  onSelectRoute: (routeId: string) => void;
  onOpenService: (serviceId: string) => void;
  onOpenRoute: (routeId: string) => void;
  onAction: (service: Service) => void;
  onExpandedChange?: (expanded: boolean) => void;
}

function actionLabel(service: Service): string | null {
  switch (service.status) {
    case 'ASSIGNED':
      return 'Aceptar';
    case 'ACCEPTED':
      return 'Iniciar ruta';
    case 'IN_TRANSIT':
      return 'Entregar';
    default:
      return null;
  }
}

function serviceVisuals(
  status: Service['status'],
  colors: ReturnType<typeof useTheme>['colors'],
) {
  switch (status) {
    case 'ASSIGNED':
      return {
        icon: 'time-outline' as const,
        iconColor: colors.warningText,
        iconBg: colors.warningBg,
      };
    case 'IN_TRANSIT':
      return {
        icon: 'navigate-outline' as const,
        iconColor: colors.infoText,
        iconBg: colors.infoBg,
      };
    case 'ACCEPTED':
    default:
      return {
        icon: 'bicycle-outline' as const,
        iconColor: colors.primary,
        iconBg: colors.primaryBg,
      };
  }
}

export function HomeServicesSheet({
  activeRoute,
  services,
  selectedId,
  selectedRouteId,
  selectedService,
  routeLoading,
  loading,
  refreshing,
  error,
  actionLoadingId,
  onRefresh,
  onSelectService,
  onSelectRoute,
  onOpenService,
  onOpenRoute,
  onAction,
  onExpandedChange,
}: HomeServicesSheetProps) {
  const { colors } = useTheme();
  const totalActive = services.length + (activeRoute ? 1 : 0);
  const routeSelected = !!selectedRouteId && selectedRouteId === activeRoute?.routeId;
  const selectedAction = selectedService ? actionLabel(selectedService) : null;
  const hasFooter = !!selectedService || routeSelected;

  return (
    <BottomSheet
      collapsedHeight={HOME_SHEET_COLLAPSED_HEIGHT}
      onExpandedChange={onExpandedChange}
      header={
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={[styles.headerTitle, { color: colors.neutral900 }]}>
              Servicios activos
            </Text>
            <Text style={[styles.headerSub, { color: colors.neutral500 }]}>
              {totalActive > 0
                ? 'Toca uno para verlo en el mapa'
                : 'No tienes servicios en curso'}
            </Text>
          </View>
          <View style={[styles.countBadge, { backgroundColor: colors.primaryBg }]}>
            <Text style={[styles.countText, { color: colors.primary }]}>
              {totalActive}
            </Text>
          </View>
        </View>
      }
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {error ? (
          <TouchableOpacity
            onPress={onRefresh}
            activeOpacity={0.85}
            style={[
              styles.errorBanner,
              { backgroundColor: colors.dangerBg, borderColor: colors.danger },
            ]}
          >
            <Ionicons name="cloud-offline-outline" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.dangerText }]} numberOfLines={2}>
              {error}
            </Text>
            <Text style={[styles.errorRetry, { color: colors.dangerText }]}>Reintentar</Text>
          </TouchableOpacity>
        ) : null}

        {loading && totalActive === 0 ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.neutral500 }]}>
              Cargando servicios...
            </Text>
          </View>
        ) : null}

        {activeRoute ? (
          <SheetServiceItem
            icon={routeLoading && routeSelected ? 'sync-outline' : 'git-branch-outline'}
            iconColor={colors.primary}
            iconBg={colors.primaryBg}
            title={`Ruta · ${activeRoute.totalStops} paradas`}
            subtitle={
              routeLoading && routeSelected
                ? 'Cargando paradas...'
                : `${activeRoute.completedStops}/${activeRoute.totalStops} completadas`
            }
            meta="RUTA"
            selected={routeSelected}
            onPress={() => onSelectRoute(activeRoute.routeId)}
          />
        ) : null}

        {services.map((service) => {
          const visuals = serviceVisuals(service.status, colors);
          return (
            <SheetServiceItem
              key={service.id}
              icon={visuals.icon}
              iconColor={visuals.iconColor}
              iconBg={visuals.iconBg}
              title={service.destination_name}
              subtitle={`${service.origin_address} → ${service.destination_address}`}
              meta={`#${service.id.slice(-4).toUpperCase()}`}
              selected={selectedId === `service:${service.id}`}
              onPress={() => onSelectService(service.id)}
            />
          );
        })}

        {!loading && totalActive === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.neutral100 }]}>
              <Ionicons name="cube-outline" size={24} color={colors.neutral400} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.neutral700 }]}>
              Sin servicios activos
            </Text>
            <Text style={[styles.emptySub, { color: colors.neutral500 }]}>
              Cuando te asignen un servicio aparecerá aquí.
            </Text>
          </View>
        ) : null}

        <View style={{ height: hasFooter ? 96 : spacing.lg }} />
      </ScrollView>

      {hasFooter ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.surface,
              borderTopColor: colors.neutral100,
            },
          ]}
        >
          {selectedService ? (
            <>
              <View style={styles.footerInfo}>
                <Text
                  style={[styles.footerTitle, { color: colors.neutral900 }]}
                  numberOfLines={1}
                >
                  {selectedService.destination_name}
                </Text>
                <Text
                  style={[styles.footerSub, { color: colors.neutral500 }]}
                  numberOfLines={1}
                >
                  {selectedService.destination_address}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onOpenService(selectedService.id)}
                activeOpacity={0.8}
                style={[styles.secondaryBtn, { borderColor: colors.neutral200 }]}
              >
                <Ionicons name="document-text-outline" size={16} color={colors.neutral700} />
              </TouchableOpacity>
              {canTransition(selectedService.status) && selectedAction ? (
                <TouchableOpacity
                  onPress={() => onAction(selectedService)}
                  activeOpacity={0.85}
                  disabled={actionLoadingId === selectedService.id}
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                  {actionLoadingId === selectedService.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Text style={[styles.primaryBtnText, { color: colors.white }]}>
                      {selectedAction}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </>
          ) : activeRoute ? (
            <>
              <View style={styles.footerInfo}>
                <Text style={[styles.footerTitle, { color: colors.neutral900 }]}>
                  Ruta activa
                </Text>
                <Text style={[styles.footerSub, { color: colors.neutral500 }]}>
                  {activeRoute.completedStops}/{activeRoute.totalStops} paradas completadas
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => onOpenRoute(activeRoute.routeId)}
                activeOpacity={0.85}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: colors.white }]}>
                  Ver ruta
                </Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  headerSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.xs,
  },
  errorRetry: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  loadingText: {
    fontSize: fontSize.sm,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: spacing.xs,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  emptySub: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerInfo: {
    flex: 1,
  },
  footerTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  footerSub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  secondaryBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: {
    minWidth: 92,
    height: 40,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
});
