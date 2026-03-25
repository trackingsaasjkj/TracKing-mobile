import { renderHook, waitFor } from '@testing-library/react-native';
import { useDashboard } from '@/features/dashboard/hooks/useDashboard';
import { dashboardApi } from '@/features/dashboard/api/dashboardApi';
import type { Service } from '@/features/services/types/services.types';

jest.mock('@/features/dashboard/api/dashboardApi');

const makeService = (id: string, status: Service['status']): Service => ({
  id, status,
  origin_address: 'A', destination_address: 'B', destination_name: 'C',
  package_details: 'pkg', payment_method: 'EFECTIVO',
  total_price: 10000, delivery_price: 8000, product_price: 2000,
});

const mockKpis = { pending: 3, completed: 10, earnings: 80000 };

describe('useDashboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('loads services and KPIs', async () => {
    (dashboardApi.getAssignedServices as jest.Mock).mockResolvedValue([makeService('s1', 'ASSIGNED')]);
    (dashboardApi.getKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.services).toHaveLength(1);
    expect(result.current.kpis.pending).toBe(3);
    expect(result.current.error).toBeNull();
  });

  it('derives activeService from ACCEPTED status', async () => {
    (dashboardApi.getAssignedServices as jest.Mock).mockResolvedValue([
      makeService('s1', 'ASSIGNED'),
      makeService('s2', 'ACCEPTED'),
    ]);
    (dashboardApi.getKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeService?.id).toBe('s2');
  });

  it('derives activeService from IN_TRANSIT status', async () => {
    (dashboardApi.getAssignedServices as jest.Mock).mockResolvedValue([
      makeService('s1', 'IN_TRANSIT'),
    ]);
    (dashboardApi.getKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeService?.id).toBe('s1');
  });

  it('activeService is null when all services are ASSIGNED or DELIVERED', async () => {
    (dashboardApi.getAssignedServices as jest.Mock).mockResolvedValue([
      makeService('s1', 'ASSIGNED'),
      makeService('s2', 'DELIVERED'),
    ]);
    (dashboardApi.getKPIs as jest.Mock).mockResolvedValue(mockKpis);

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.activeService).toBeNull();
  });

  it('sets error on API failure', async () => {
    (dashboardApi.getAssignedServices as jest.Mock).mockRejectedValue({ userMessage: 'Error de red' });
    (dashboardApi.getKPIs as jest.Mock).mockRejectedValue({ userMessage: 'Error de red' });

    const { result } = renderHook(() => useDashboard());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error de red');
  });
});
