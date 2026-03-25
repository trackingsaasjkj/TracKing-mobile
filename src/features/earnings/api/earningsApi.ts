import { apiClient } from '@/core/api/apiClient';

export interface EarningsSummary {
  total_earned: number;
  total_services: number;
  period_start: string;
  period_end: string;
}

export interface Liquidation {
  id: string;
  courier_id: string;
  total_earned: number;
  total_services: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export const earningsApi = {
  getSummary: (): Promise<EarningsSummary> =>
    apiClient.get<EarningsSummary>('/api/liquidations/earnings').then((r) => r.data),

  getLiquidations: (): Promise<Liquidation[]> =>
    apiClient.get<Liquidation[]>('/api/liquidations').then((r) => r.data),
};
