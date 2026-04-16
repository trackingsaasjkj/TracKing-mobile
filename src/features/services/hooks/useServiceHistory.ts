import { useInfiniteQuery } from '@tanstack/react-query';
import { servicesApi } from '../api/servicesApi';
import type { Service, ServiceStatus } from '../types/services.types';

const HISTORY_LIMIT = 20;

/**
 * Infinite-scroll hook for the courier's service history.
 * Fetches paginated DELIVERED services from GET /api/courier/services/history.
 *
 * Usage:
 *   const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useServiceHistory();
 *   const services = data?.pages.flatMap(p => p.data) ?? [];
 */
export function useServiceHistory(status: ServiceStatus = 'DELIVERED') {
  return useInfiniteQuery({
    queryKey: ['courier-services-history', status],
    queryFn: ({ pageParam }) =>
      servicesApi.getHistory(pageParam as number, HISTORY_LIMIT, status),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const fetched = lastPage.page * lastPage.limit;
      return fetched < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

/** Flattens all pages into a single Service array */
export function flattenHistoryPages(
  data: ReturnType<typeof useServiceHistory>['data'],
): Service[] {
  return data?.pages.flatMap((p) => p.data) ?? [];
}
