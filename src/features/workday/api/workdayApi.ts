import { apiClient } from '@/core/api/apiClient';

export const workdayApi = {
  start: (): Promise<void> =>
    apiClient.post('/api/courier/jornada/start').then(() => undefined),

  end: (): Promise<void> =>
    apiClient.post('/api/courier/jornada/end').then(() => undefined),
};
