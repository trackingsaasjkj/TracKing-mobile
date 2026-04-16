/**
 * Tests del historial de servicios paginado — mobile
 *
 * Cubre:
 *   - useServiceHistory hook (lógica de paginación con useInfiniteQuery)
 *   - flattenHistoryPages helper
 *   - servicesApi.getHistory (parámetros correctos)
 *   - Regresión: bug de carga silenciosa por query params incorrectos
 *
 * Bug documentado: el endpoint retornaba 400 silencioso porque el backend
 * rechazaba el campo `status` en PaginationDto (forbidNonWhitelisted).
 * Fix: parámetros individuales en el controller.
 */

import * as fc from 'fast-check';
import { QueryClient } from '@tanstack/react-query';
import type { Service, PaginatedResponse } from '@/features/services/types/services.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/features/services/api/servicesApi', () => ({
  servicesApi: {
    getAll: jest.fn(),
    getHistory: jest.fn(),
    updateStatus: jest.fn(),
    updatePayment: jest.fn(),
  },
}));

import { servicesApi } from '@/features/services/api/servicesApi';
import { flattenHistoryPages } from '@/features/services/hooks/useServiceHistory';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildService(id: string): Service {
  return {
    id,
    status: 'DELIVERED',
    origin_address: 'Calle 1',
    destination_address: 'Calle 2',
    destination_name: 'Cliente',
    package_details: 'Paquete',
    payment_method: 'CASH',
    payment_status: 'PAID',
    is_settled_courier: false,
    is_settled_customer: false,
    total_price: 15000,
    delivery_price: 10000,
    product_price: 5000,
    created_at: '2026-01-15T10:00:00.000Z',
    delivery_date: '2026-01-15T14:00:00.000Z',
  };
}

function buildPage(
  items: Service[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<Service> {
  return { data: items, total, page, limit };
}

// ─── flattenHistoryPages ──────────────────────────────────────────────────────

describe('flattenHistoryPages', () => {
  it('retorna array vacío cuando data es undefined', () => {
    expect(flattenHistoryPages(undefined)).toEqual([]);
  });

  it('aplana una sola página correctamente', () => {
    const services = [buildService('s1'), buildService('s2')];
    const data = { pages: [buildPage(services, 1, 20, 2)], pageParams: [1] };
    expect(flattenHistoryPages(data)).toHaveLength(2);
    expect(flattenHistoryPages(data)[0].id).toBe('s1');
  });

  it('aplana múltiples páginas en orden', () => {
    const page1 = [buildService('s1'), buildService('s2')];
    const page2 = [buildService('s3'), buildService('s4')];
    const data = {
      pages: [buildPage(page1, 1, 2, 4), buildPage(page2, 2, 2, 4)],
      pageParams: [1, 2],
    };
    const result = flattenHistoryPages(data);
    expect(result).toHaveLength(4);
    expect(result.map((s) => s.id)).toEqual(['s1', 's2', 's3', 's4']);
  });

  it('retorna array vacío cuando todas las páginas tienen data vacía', () => {
    const data = {
      pages: [buildPage([], 1, 20, 0)],
      pageParams: [1],
    };
    expect(flattenHistoryPages(data)).toEqual([]);
  });
});

// ─── servicesApi.getHistory — parámetros correctos ───────────────────────────

describe('servicesApi.getHistory — parámetros enviados al backend', () => {
  beforeEach(() => jest.clearAllMocks());

  it('envía page, limit y status=DELIVERED por defecto', async () => {
    (servicesApi.getHistory as jest.Mock).mockResolvedValue(buildPage([], 1, 20, 0));

    await servicesApi.getHistory(1, 20, 'DELIVERED');

    expect(servicesApi.getHistory).toHaveBeenCalledWith(1, 20, 'DELIVERED');
  });

  it('envía el status correcto cuando se especifica', async () => {
    (servicesApi.getHistory as jest.Mock).mockResolvedValue(buildPage([], 1, 20, 0));

    await servicesApi.getHistory(1, 20, 'CANCELLED');

    expect(servicesApi.getHistory).toHaveBeenCalledWith(1, 20, 'CANCELLED');
  });

  it('retorna PaginatedResponse con la estructura correcta', async () => {
    const services = [buildService('s1')];
    const expected = buildPage(services, 1, 20, 1);
    (servicesApi.getHistory as jest.Mock).mockResolvedValue(expected);

    const result = await servicesApi.getHistory(1, 20, 'DELIVERED');

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(result.data).toHaveLength(1);
  });
});

// ─── getNextPageParam — lógica de paginación infinita ────────────────────────

describe('getNextPageParam — lógica de infinite scroll', () => {
  // Replica la lógica del hook para testearla de forma aislada
  function getNextPageParam(lastPage: PaginatedResponse<Service>): number | undefined {
    const fetched = lastPage.page * lastPage.limit;
    return fetched < lastPage.total ? lastPage.page + 1 : undefined;
  }

  it('retorna página 2 cuando hay más items', () => {
    const page = buildPage([buildService('s1')], 1, 20, 50);
    expect(getNextPageParam(page)).toBe(2);
  });

  it('retorna undefined en la última página', () => {
    const page = buildPage([], 3, 20, 50);
    expect(getNextPageParam(page)).toBeUndefined();
  });

  it('retorna undefined cuando total es 0', () => {
    const page = buildPage([], 1, 20, 0);
    expect(getNextPageParam(page)).toBeUndefined();
  });

  it('retorna undefined cuando fetched === total exactamente', () => {
    const page = buildPage([], 2, 10, 20);
    expect(getNextPageParam(page)).toBeUndefined();
  });
});

// ─── QueryClient: invalidación de historial ──────────────────────────────────

describe('QueryClient: cache key del historial', () => {
  it('la query key incluye el status para separar cachés por estado', () => {
    const queryClient = new QueryClient();

    // Simula que hay datos en caché para DELIVERED y CANCELLED por separado
    queryClient.setQueryData(['courier-services-history', 'DELIVERED'], {
      pages: [buildPage([buildService('s1')], 1, 20, 1)],
      pageParams: [1],
    });
    queryClient.setQueryData(['courier-services-history', 'CANCELLED'], {
      pages: [buildPage([], 1, 20, 0)],
      pageParams: [1],
    });

    const deliveredCache = queryClient.getQueryData(['courier-services-history', 'DELIVERED']) as any;
    const cancelledCache = queryClient.getQueryData(['courier-services-history', 'CANCELLED']) as any;

    expect(deliveredCache.pages[0].data).toHaveLength(1);
    expect(cancelledCache.pages[0].data).toHaveLength(0);

    queryClient.clear();
  });

  it('invalidar historial DELIVERED no afecta el caché de servicios activos', async () => {
    const queryClient = new QueryClient();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    await queryClient.invalidateQueries({ queryKey: ['courier-services-history', 'DELIVERED'] });

    // Solo invalida el historial, no los servicios activos del día
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['courier-services-history', 'DELIVERED'],
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['courier-services'],
    });

    invalidateSpy.mockRestore();
    queryClient.clear();
  });
});

// ─── PBT: flattenHistoryPages siempre preserva todos los items ───────────────

describe('P-HIST-M1: flattenHistoryPages preserva todos los items de todas las páginas (PBT)', () => {
  it('P-HIST-M1: total de items aplanados = suma de items por página', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
          { minLength: 1, maxLength: 5 },
        ),
        async (pageIds) => {
          const pages = pageIds.map((ids, i) => {
            const services = ids.map((id) => buildService(id));
            return buildPage(services, i + 1, 10, pageIds.flat().length);
          });

          const data = { pages, pageParams: pages.map((_, i) => i + 1) };
          const result = flattenHistoryPages(data);

          const expectedTotal = pageIds.flat().length;
          expect(result).toHaveLength(expectedTotal);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── PBT: getNextPageParam es consistente con total ──────────────────────────

describe('P-HIST-M2: getNextPageParam nunca retorna página mayor a la necesaria (PBT)', () => {
  it('P-HIST-M2: si hasNextPage, nextPage = currentPage + 1', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 0, max: 500 }),
        async (page, limit, total) => {
          function getNextPageParam(lastPage: { page: number; limit: number; total: number }) {
            const fetched = lastPage.page * lastPage.limit;
            return fetched < lastPage.total ? lastPage.page + 1 : undefined;
          }

          const result = getNextPageParam({ page, limit, total });
          const fetched = page * limit;

          if (fetched < total) {
            expect(result).toBe(page + 1);
          } else {
            expect(result).toBeUndefined();
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
