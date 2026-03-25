import { apiClient } from '@/core/api/apiClient';
import type { Service, ServiceStatus } from '../types/services.types';

export const servicesApi = {
  getAll: (): Promise<Service[]> =>
    apiClient.get<Service[]>('/api/courier/services').then((r) => r.data),

  getById: (id: string): Promise<Service> =>
    apiClient.get<Service>(`/api/courier/services/${id}`).then((r) => r.data),

  updateStatus: (id: string, status: ServiceStatus): Promise<Service> =>
    apiClient
      .post<Service>(`/api/courier/services/${id}/status`, { status })
      .then((r) => r.data),
};
