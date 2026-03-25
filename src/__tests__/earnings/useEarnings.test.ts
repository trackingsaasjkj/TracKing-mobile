import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useEarnings } from '@/features/earnings/hooks/useEarnings';
import { earningsApi } from '@/features/earnings/api/earningsApi';

jest.mock('@/features/earnings/api/earningsApi');

const mockSummary = {
  total_earned: 150000,
  total_services: 18,
  period_start: '2026-01-01',
  period_end: '2026-01-31',
};

const mockLiquidations = [
  {
    id: 'liq-1',
    courier_id: 'c1',
    total_earned: 80000,
    total_services: 10,
    start_date: '2026-01-01',
    end_date: '2026-01-15',
    created_at: '2026-01-16T00:00:00Z',
  },
];

describe('useEarnings', () => {
  beforeEach(() => jest.clearAllMocks());

  it('starts in loading state', () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(mockSummary);
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue(mockLiquidations);
    const { result } = renderHook(() => useEarnings());
    expect(result.current.loading).toBe(true);
  });

  it('loads summary and liquidations successfully', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(mockSummary);
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue(mockLiquidations);

    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.summary?.total_earned).toBe(150000);
    expect(result.current.liquidations).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('sets error on API failure', async () => {
    (earningsApi.getSummary as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });
    (earningsApi.getLiquidations as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });

    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.summary).toBeNull();
  });

  it('refresh reloads data', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(mockSummary);
    (earningsApi.getLiquidations as jest.Mock).mockResolvedValue(mockLiquidations);

    const { result } = renderHook(() => useEarnings());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { result.current.refresh(); });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(earningsApi.getSummary).toHaveBeenCalledTimes(2);
  });
});
