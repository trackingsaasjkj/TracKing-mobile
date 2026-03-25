import { renderHook, act } from '@testing-library/react-native';
import { useWorkday } from '@/features/workday/hooks/useWorkday';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useServicesStore } from '@/features/services/store/servicesStore';
import { workdayApi } from '@/features/workday/api/workdayApi';
import type { CourierUser } from '@/features/auth/types/auth.types';
import type { Service } from '@/features/services/types/services.types';

jest.mock('@/features/workday/api/workdayApi');
jest.mock('@/core/storage/secureStorage', () => ({
  secureStorage: { setToken: jest.fn(), clearToken: jest.fn(), getToken: jest.fn() },
}));

const mockUser: CourierUser = {
  id: 'u1', name: 'Test', email: 't@t.com', role: 'COURIER',
  company_id: 'c1', operationalStatus: 'UNAVAILABLE',
};

const makeService = (status: Service['status']): Service => ({
  id: 's1', status, origin_address: '', destination_address: '',
  destination_name: '', package_details: '', payment_method: 'EFECTIVO',
  total_price: 0, delivery_price: 0, product_price: 0,
});

describe('useWorkday', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: mockUser, accessToken: 'tok', isAuthenticated: true });
    useServicesStore.setState({ services: [] });
    jest.clearAllMocks();
  });

  it('startWorkday calls API and sets status to AVAILABLE', async () => {
    (workdayApi.start as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());

    await act(async () => { await result.current.startWorkday(); });

    expect(workdayApi.start).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user?.operationalStatus).toBe('AVAILABLE');
  });

  it('startWorkday returns ok:true on success', async () => {
    (workdayApi.start as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());

    let res: any;
    await act(async () => { res = await result.current.startWorkday(); });
    expect(res.ok).toBe(true);
  });

  it('startWorkday returns ok:false on API error', async () => {
    (workdayApi.start as jest.Mock).mockRejectedValue({ userMessage: 'Error de red' });
    const { result } = renderHook(() => useWorkday());

    let res: any;
    await act(async () => { res = await result.current.startWorkday(); });
    expect(res.ok).toBe(false);
    expect(res.error).toBe('Error de red');
  });

  it('endWorkday is blocked when active services exist', async () => {
    useServicesStore.setState({ services: [makeService('IN_TRANSIT')] });
    const { result } = renderHook(() => useWorkday());

    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });

    expect(res.ok).toBe(false);
    expect(res.error).toContain('servicios activos');
    expect(workdayApi.end).not.toHaveBeenCalled();
  });

  it('endWorkday succeeds when no active services', async () => {
    useServicesStore.setState({ services: [makeService('DELIVERED')] });
    (workdayApi.end as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useWorkday());

    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });

    expect(res.ok).toBe(true);
    expect(useAuthStore.getState().user?.operationalStatus).toBe('UNAVAILABLE');
  });

  it('endWorkday returns ok:false on API error', async () => {
    useServicesStore.setState({ services: [] });
    (workdayApi.end as jest.Mock).mockRejectedValue({ userMessage: 'Fallo del servidor' });
    const { result } = renderHook(() => useWorkday());

    let res: any;
    await act(async () => { res = await result.current.endWorkday(); });
    expect(res.ok).toBe(false);
  });
});
