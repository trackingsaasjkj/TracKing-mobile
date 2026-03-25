import { useEffect, useState, useCallback } from 'react';
import { dashboardApi } from '../api/dashboardApi';
import type { KPISummary } from '../types/dashboard.types';
import type { Service } from '@/features/services/types/services.types';

interface DashboardState {
  services: Service[];
  kpis: KPISummary;
  activeService: Service | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT_KPIS: KPISummary = { pending: 0, completed: 0, earnings: 0 };

export function useDashboard(): DashboardState {
  const [services, setServices] = useState<Service[]>([]);
  const [kpis, setKpis] = useState<KPISummary>(DEFAULT_KPIS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [svcs, kpiData] = await Promise.all([
        dashboardApi.getAssignedServices(),
        dashboardApi.getKPIs(),
      ]);
      setServices(svcs);
      setKpis(kpiData);
    } catch (err: any) {
      setError(err?.userMessage ?? 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeService =
    services.find((s) => s.status === 'ACCEPTED' || s.status === 'IN_TRANSIT') ?? null;

  return { services, kpis, activeService, loading, error, refresh: load };
}
