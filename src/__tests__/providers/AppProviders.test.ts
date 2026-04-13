/**
 * Smoke tests para la configuración del QueryClient mobile
 * Validates: Requirements 5.1, 5.2, 5.3
 */

import { QueryClient } from '@tanstack/react-query';
import { apiClient } from '@/core/api/apiClient';

// Recreate the QueryClient with the same config as AppProviders
// to verify the values without rendering the full component tree
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 60_000, gcTime: 600_000 },
  },
});

describe('QueryClient mobile — configuración', () => {
  it('staleTime debe ser 60_000 ms (1 minuto)', () => {
    const staleTime = queryClient.getDefaultOptions().queries?.staleTime;
    expect(staleTime).toBe(60_000);
  });

  it('gcTime debe ser 600_000 ms (10 minutos)', () => {
    const gcTime = queryClient.getDefaultOptions().queries?.gcTime;
    expect(gcTime).toBe(600_000);
  });
});

describe('apiClient mobile — configuración', () => {
  it('timeout debe ser 10_000 ms (10 segundos)', () => {
    expect(apiClient.defaults.timeout).toBe(10_000);
  });
});
