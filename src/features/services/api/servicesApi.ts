import { apiClient, unwrap, type ApiResponse } from '@/core/api/apiClient';
import type { Service, ServiceStatus, PaymentStatus, PaginatedResponse } from '../types/services.types';

export const servicesApi = {
  /** GET /api/courier/services — servicios activos del mensajero (feed del día) */
  getAll: (): Promise<Service[]> =>
    apiClient
      .get<ApiResponse<Service[]>>('/api/courier/services')
      .then(unwrap),

  /** GET /api/courier/services/:id — detalle de un servicio individual */
  getById: (id: string): Promise<Service> =>
    apiClient
      .get<ApiResponse<Service>>(`/api/courier/services/${id}`)
      .then(unwrap),

  /** GET /api/courier/services/history — historial paginado de servicios */
  getHistory: (page: number, limit = 20, status: ServiceStatus = 'DELIVERED'): Promise<PaginatedResponse<Service>> =>
    apiClient
      .get<ApiResponse<PaginatedResponse<Service>>>('/api/courier/services/history', {
        params: { page, limit, status },
      })
      .then(unwrap),

  /** POST /api/courier/services/:id/status — cambia el estado del servicio */
  updateStatus: (id: string, status: ServiceStatus): Promise<Service> =>
    apiClient
      .post<ApiResponse<Service>>(`/api/courier/services/${id}/status`, { status })
      .then(unwrap),

  /** POST /api/courier/services/:id/payment — cambia el estado de pago */
  updatePayment: (id: string, payment_status: PaymentStatus): Promise<Service> =>
    apiClient
      .post<ApiResponse<Service>>(`/api/courier/services/${id}/payment`, { payment_status })
      .then(unwrap),
};
