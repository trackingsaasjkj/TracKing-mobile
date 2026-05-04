import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';

export interface Settlement {
  id: string;
  courier_id: string;
  company_id: string;
  total_collected: number;
  company_commission: number;
  courier_payment: number;
  total_services: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface EarningsSummary {
  total_settlements: number;
  total_services: number;
  courier_payment: number;
  /** Full list of settlements included in the summary */
  settlements: Settlement[];
}

export const earningsApi = {
  /**
   * GET /api/courier/settlements/earnings
   * Resumen acumulado de ganancias del mensajero autenticado.
   * El courier_id se resuelve desde el JWT — no se envía en la request.
   */
  getSummary: (): Promise<EarningsSummary> =>
    apiClient
      .get<ApiResponse<EarningsSummary>>('/api/courier/settlements/earnings')
      .then(unwrap),

  /**
   * GET /api/courier/settlements
   * Lista todas las liquidaciones del mensajero autenticado.
   */
  getSettlements: (): Promise<Settlement[]> =>
    apiClient
      .get<ApiResponse<Settlement[]>>('/api/courier/settlements')
      .then(unwrap),

  /**
   * GET /api/courier/settlements/:id
   * Detalle de una liquidación específica.
   */
  getSettlementById: (id: string): Promise<Settlement> =>
    apiClient
      .get<ApiResponse<Settlement>>(`/api/courier/settlements/${id}`)
      .then(unwrap),
};
