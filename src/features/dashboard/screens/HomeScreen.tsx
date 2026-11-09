import React, { useCallback, useState } from 'react';
import {
  Alert,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useTheme } from '@/shared/ui/useTheme';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { useRoutesStore } from '@/features/routes/store/routesStore';
import { servicesApi } from '@/features/services/api/servicesApi';
import { nextStatus } from '@/features/services/hooks/useServices';
import type { Service } from '@/features/services/types/services.types';
import { useLocation } from '@/features/tracking/hooks/useLocation';
import { Header } from '../components/Header';
import { HomeMap } from '../components/HomeMap';
import { MapKpiChips } from '../components/MapKpiChips';
import {
  HOME_SHEET_COLLAPSED_HEIGHT,
  HomeServicesSheet,
} from '../components/HomeServicesSheet';
import { useDashboard } from '../hooks/useDashboard';
import { useActiveRouteSummary } from '../hooks/useActiveRouteSummary';
import { useHomeSelection } from '../hooks/useHomeSelection';
import type { MainTabParamList } from '@/app/navigation/TabNavigator';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const user = useAuthStore((s) => s.user);
  const operationalStatus = user?.operationalStatus;
  const navigation = useNavigation<HomeNav>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const { kpis, activeServices, loading, refreshing, error, refresh } = useDashboard();
  const activeRoute = useActiveRouteSummary();
  const activeRouteInStore = useRoutesStore((s) => s.activeRoute);
  const updateService = useServicesStore((s) => s.updateService);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);

  // HomeScreen is always mounted — it owns the foreground tracking lifecycle.
  // GPS runs for the whole workday (AVAILABLE + IN_SERVICE) so the map always
  // shows the courier. Positions are only POSTed while IN_SERVICE.
  const isOnShift =
    operationalStatus === 'AVAILABLE' || operationalStatus === 'IN_SERVICE';
  const { latitude, longitude, permissionDenied } = useLocation({
    active: isOnShift,
    reportToBackend: operationalStatus === 'IN_SERVICE',
  });

  const {
    selectedId,
    selectedService,
    selectedRouteId,
    routeLoading,
    mapPoints,
    recenterToken,
    selectService,
    selectRoute,
    recenter,
  } = useHomeSelection({ activeServices, activeRoute });

  // Services that belong to the active route are represented by the route row.
  const routeServiceIds = new Set<string>();
  (activeRouteInStore?.stops ?? []).forEach((stop) => {
    if (stop.service_id) routeServiceIds.add(stop.service_id);
  });
  if (activeRoute) {
    activeServices.forEach((svc) => {
      if (svc.routeStop?.route.id === activeRoute.routeId) {
        routeServiceIds.add(svc.id);
      }
    });
  }
  const standaloneServices = activeServices.filter((s) => !routeServiceIds.has(s.id));

  const openService = useCallback(
    (serviceId: string) => {
      navigation.navigate('Orders', {
        screen: 'ServiceDetail',
        params: { serviceId },
      } as any);
    },
    [navigation],
  );

  const openRoute = useCallback(
    (routeId: string) => {
      navigation.navigate('Orders', {
        screen: 'RouteDetail',
        params: { routeId },
      } as any);
    },
    [navigation],
  );

  const handleAction = useCallback(
    async (service: Service) => {
      const next = nextStatus(service.status);
      if (!next) return;

      setActionLoadingId(service.id);
      try {
        const updated = await servicesApi.updateStatus(service.id, next);
        updateService(updated);
      } catch (err: any) {
        Alert.alert(
          'Error',
          err?.userMessage ?? 'No se pudo actualizar el servicio',
        );
      } finally {
        setActionLoadingId(null);
      }
    },
    [updateService],
  );

  const expandedHeight = Math.min(windowHeight * 0.72, windowHeight - 96);
  const bottomInset = sheetExpanded
    ? expandedHeight
    : HOME_SHEET_COLLAPSED_HEIGHT;

  const selectionKey = `${selectedId ?? 'none'}:${mapPoints
    .map((p) => `${p.id}:${p.status ?? ''}`)
    .join('|')}`;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <HomeMap
        latitude={latitude}
        longitude={longitude}
        permissionDenied={permissionDenied}
        selection={mapPoints}
        selectionKey={selectionKey}
        bottomInset={bottomInset}
        recenterToken={recenterToken}
        onRecenter={recenter}
      />

      <View
        pointerEvents="box-none"
        style={[styles.topOverlay, { paddingTop: insets.top }]}
      >
        <Header name={user?.name ?? ''} floating />
        <MapKpiChips
          pending={kpis.pending}
          inTransit={kpis.inTransit}
          earnings={kpis.earnings}
        />
      </View>

      <HomeServicesSheet
        activeRoute={activeRoute}
        services={standaloneServices}
        selectedId={selectedId}
        selectedRouteId={selectedRouteId}
        selectedService={selectedService}
        routeLoading={routeLoading}
        loading={loading}
        refreshing={refreshing}
        error={error}
        actionLoadingId={actionLoadingId}
        onRefresh={refresh}
        onSelectService={selectService}
        onSelectRoute={selectRoute}
        onOpenService={openService}
        onOpenRoute={openRoute}
        onAction={handleAction}
        onExpandedChange={setSheetExpanded}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
});
