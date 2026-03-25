import { apiClient } from '@/core/api/apiClient';

export interface EvidencePayload {
  image_url: string;
}

export interface EvidenceResponse {
  id: string;
  service_id: string;
  image_url: string;
  created_at: string;
}

export const evidenceApi = {
  upload: (serviceId: string, payload: EvidencePayload): Promise<EvidenceResponse> =>
    apiClient
      .post<EvidenceResponse>(`/api/courier/services/${serviceId}/evidence`, payload)
      .then((r) => r.data),

  get: (serviceId: string): Promise<EvidenceResponse> =>
    apiClient
      .get<EvidenceResponse>(`/api/services/${serviceId}/evidence`)
      .then((r) => r.data),
};
