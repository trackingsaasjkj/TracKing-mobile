import { apiClient } from '@/core/api/apiClient';
import type { Service } from '@/features/services/types/services.types';
import type { KPISummary } from '../types/dashboard.types';

export const dashboardApi = {
  getAssignedServices: (): Promise<Service[]> =>
    apiClient.get<Service[]>('/api/servicios').then((r) => r.data),

  getKPIs: (): Promise<KPISummary> =>
    apiClient.get<KPISummary>('/api/servicios/kpis').then((r) => r.data),
};
