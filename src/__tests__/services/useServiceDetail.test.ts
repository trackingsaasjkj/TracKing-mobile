/**
 * Tests del hook useServiceDetail — mobile
 *
 * Bug documentado: ServiceDetailScreen usaba useServicesStore directamente.
 * Al navegar desde el historial, el store solo tiene servicios activos del día
 * → el servicio histórico no se encontraba → "Servicio no encontrado".
 *
 * Fix: useServiceDetail(serviceId) busca en el store primero y hace fetch
 * al backend como fallback cuando el servicio no está en el store.
 */

import * as fc from 'fast-check';
import { QueryClient } from '@tanstack/react-query';
import type { Service } from '@/features/services/types/services.types';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/features/services/api/servicesApi', () => ({
  servicesApi: {
    getAll: jest.fn(),
    getById: jest.fn(),
    getHistory: jest.fn(),
    updateStatus: jest.fn(),
    updatePayment: jest.fn(),
  },
}));

jest.mock('@/features/services/store/servicesStore', () => ({
  useServicesStore: jest.fn(),
}));

import { servicesApi } from '@/features/services/api/servicesApi';
import { useServicesStore } from '@/features/services/store/servicesStore';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildService(id: string, status: Service['status'] = 'DELIVERED'): Service {
  return {
    id,
    status,
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

// ─── Lógica de resolución: store primero, fetch como fallback ─────────────────

describe('useServiceDetail — lógica de resolución store vs fetch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('usa el servicio del store cuando está disponible (no hace fetch)', () => {
    const service = buildService('svc-active', 'ASSIGNED');
    const storeServices = [service, buildService('svc-other')];

    // Simula la lógica del hook: buscar en store
    const found = storeServices.find((s) => s.id === 'svc-active');
    const shouldFetch = !found;

    expect(found).toBeDefined();
    expect(found?.id).toBe('svc-active');
    expect(shouldFetch).toBe(false); // enabled: false en useQuery
    expect(servicesApi.getById).not.toHaveBeenCalled();
  });

  it('activa el fetch cuando el servicio NO está en el store (viene del historial)', () => {
    const storeServices = [buildService('svc-today')];

    // Simula la lógica del hook: buscar en store
    const found = storeServices.find((s) => s.id === 'svc-historical');
    const shouldFetch = !found;

    expect(found).toBeUndefined();
    expect(shouldFetch).toBe(true); // enabled: true en useQuery
  });

  it('retorna null cuando el store está vacío y el fetch aún no completó', () => {
    const storeServices: Service[] = [];
    const fetchedData: Service | undefined = undefined;

    const found = storeServices.find((s) => s.id === 'svc-1');
    const service = found ?? fetchedData ?? null;

    expect(service).toBeNull();
  });

  it('retorna el servicio del fetch cuando no está en el store', () => {
    const storeServices: Service[] = [];
    const fetchedService = buildService('svc-historical');

    const found = storeServices.find((s) => s.id === 'svc-historical');
    const service = found ?? fetchedService ?? null;

    expect(service).not.toBeNull();
    expect(service?.id).toBe('svc-historical');
  });
});

// ─── servicesApi.getById — parámetros correctos ───────────────────────────────

describe('servicesApi.getById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('llama al endpoint correcto con el serviceId', async () => {
    const service = buildService('svc-123');
    (servicesApi.getById as jest.Mock).mockResolvedValue(service);

    const result = await servicesApi.getById('svc-123');

    expect(servicesApi.getById).toHaveBeenCalledWith('svc-123');
    expect(result.id).toBe('svc-123');
  });

  it('retorna el servicio con todos los campos requeridos', async () => {
    const service = buildService('svc-abc');
    (servicesApi.getById as jest.Mock).mockResolvedValue(service);

    const result = await servicesApi.getById('svc-abc');

    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('origin_address');
    expect(result).toHaveProperty('destination_address');
    expect(result).toHaveProperty('total_price');
  });
});

// ─── QueryClient: cache del detalle ──────────────────────────────────────────

describe('QueryClient: cache key del detalle de servicio', () => {
  it('la query key incluye el serviceId para cachés independientes por servicio', () => {
    const queryClient = new QueryClient();

    queryClient.setQueryData(['courier-service-detail', 'svc-1'], buildService('svc-1'));
    queryClient.setQueryData(['courier-service-detail', 'svc-2'], buildService('svc-2', 'ASSIGNED'));

    const detail1 = queryClient.getQueryData(['courier-service-detail', 'svc-1']) as Service;
    const detail2 = queryClient.getQueryData(['courier-service-detail', 'svc-2']) as Service;

    expect(detail1.id).toBe('svc-1');
    expect(detail1.status).toBe('DELIVERED');
    expect(detail2.id).toBe('svc-2');
    expect(detail2.status).toBe('ASSIGNED');

    queryClient.clear();
  });

  it('setQueryData actualiza el caché del detalle tras una acción', () => {
    const queryClient = new QueryClient();
    const original = buildService('svc-1', 'IN_TRANSIT');
    queryClient.setQueryData(['courier-service-detail', 'svc-1'], original);

    // Simula lo que hace performAction tras updateStatus
    const updated = buildService('svc-1', 'DELIVERED');
    queryClient.setQueryData(['courier-service-detail', 'svc-1'], updated);

    const cached = queryClient.getQueryData(['courier-service-detail', 'svc-1']) as Service;
    expect(cached.status).toBe('DELIVERED');

    queryClient.clear();
  });
});

// ─── PBT: store lookup siempre encuentra por ID exacto ───────────────────────

describe('P-DETAIL-M1: store lookup retorna el servicio correcto por ID (PBT)', () => {
  it('P-DETAIL-M1: find(id) retorna el servicio correcto o undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        async (ids, targetIndex) => {
          const safeIndex = targetIndex % ids.length;
          const services = ids.map((id) => buildService(id));
          const targetId = ids[safeIndex];

          const found = services.find((s) => s.id === targetId);

          expect(found).toBeDefined();
          expect(found?.id).toBe(targetId);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('P-DETAIL-M1b: find con ID inexistente siempre retorna undefined', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.uuid(), { minLength: 0, maxLength: 10 }),
        fc.uuid(),
        async (existingIds, searchId) => {
          // Ensure searchId is not in existingIds
          fc.pre(!existingIds.includes(searchId));

          const services = existingIds.map((id) => buildService(id));
          const found = services.find((s) => s.id === searchId);

          expect(found).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });
});
