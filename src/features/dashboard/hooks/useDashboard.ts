import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import { earningsApi } from '@/features/earnings/api/earningsApi';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import type { KPISummary } from '../types/dashboard.types';
import type { Service } from '@/features/services/types/services.types';

interface DashboardState {
  kpis: KPISummary;
  activeServices: Service[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_KPIS: KPISummary = { pending: 0, inTransit: 0, completed: 0, earnings: 0 };


export function useDashboard(): DashboardState {
  const setOperationalStatus = useAuthStore((s) => s.setOperationalStatus);
  const { services, setServices } = useServicesStore();
  const [kpis, setKpis] = useState<KPISummary>(DEFAULT_KPIS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (isRefresh: boolean) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      try {
        const [profile, svcs] = await Promise.all([
          dashboardApi.getProfile(),
          dashboardApi.getAssignedServices(),
        ]);

        setOperationalStatus(profile.operational_status);
        setServices(svcs);

        const computed = dashboardApi.computeKPIs(svcs);

        // Earnings summary — 403 is expected for some roles
        let earnings = 0;
        try {
          const summary = await earningsApi.getSummary();
          earnings = summary.courier_payment;
        } catch {
          // silently ignored — role may not have access
        }

        setKpis({ ...computed, earnings });
      } catch (err: any) {
        setError(err?.userMessage ?? 'Error al cargar el dashboard');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [setOperationalStatus, setServices],
  );

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  // All services the courier needs to act on today
  const activeServices = services.filter(
    (s) => s.status === 'ASSIGNED' || s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT',
  );

  return { kpis, activeServices, loading, refreshing, error, refresh };
}
