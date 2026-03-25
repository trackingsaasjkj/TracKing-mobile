import { apiClient } from '@/core/api/apiClient';

export interface LocationPayload {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export const locationApi = {
  send: (payload: LocationPayload): Promise<void> =>
    apiClient.post('/api/courier/location', payload).then(() => undefined),
};
