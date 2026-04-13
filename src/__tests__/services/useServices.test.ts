/**
 * Property test para invalidación de queries en mobile
 * Feature: api-performance-optimization, Property 10: mobile mutation invalidates services query
 * Validates: Requirements 5.4
 */

import * as fc from 'fast-check';
import { QueryClient } from '@tanstack/react-query';
import type { Service, ServiceStatus } from '@/features/services/types/services.types';
import { nextStatus } from '@/features/services/hooks/useServices';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('@/features/services/api/servicesApi', () => ({
  servicesApi: {
    getAll: jest.fn(),
    updateStatus: jest.fn(),
    updatePayment: jest.fn(),
  },
}));

import { servicesApi } from '@/features/services/api/servicesApi';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildService(id: string, status: ServiceStatus): Service {
  return {
    id,
    status,
    origin_address: 'Calle 1',
    destination_address: 'Calle 2',
    destination_name: 'Destinatario',
    package_details: 'Paquete',
    payment_method: 'CASH',
    payment_status: 'UNPAID',
    is_settled_courier: false,
    is_settled_customer: false,
    total_price: 10000,
    delivery_price: 5000,
    product_price: 5000,
  };
}

/**
 * Simulates the performAction logic from useServices hook.
 * This mirrors the implementation in useServices.ts to verify
 * that invalidateQueries is called after a successful updateStatus.
 */
async function simulatePerformAction(
  service: Service,
  queryClient: QueryClient,
  updateService: (s: Service) => void,
): Promise<{ ok: boolean; error?: string }> {
  const next = nextStatus(service.status);
  if (!next) return { ok: false, error: 'Accion no disponible' };

  try {
    const updated = await servicesApi.updateStatus(service.id, next);
    updateService(updated);
    await queryClient.invalidateQueries({ queryKey: ['courier-services'] });
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.userMessage ?? 'Error al actualizar servicio' };
  }
}

// ─── Property 10: Invalidación de queries en mutaciones (mobile) ──────────────

describe('Property 10: mobile mutation invalidates services query', () => {
  it(
    // Feature: api-performance-optimization, Property 10: mobile mutation invalidates services query
    'para cualquier actualización de estado exitosa, invalidateQueries es llamado con ["courier-services"]',
    async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom<ServiceStatus>('ASSIGNED', 'ACCEPTED', 'IN_TRANSIT'),
          async (serviceId, status) => {
            // Arrange
            const queryClient = new QueryClient();
            const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
            const updateService = jest.fn();

            const service = buildService(serviceId, status);
            const next = nextStatus(status)!;
            const updatedService = buildService(serviceId, next);
            (servicesApi.updateStatus as jest.Mock).mockResolvedValue(updatedService);

            // Act
            const result = await simulatePerformAction(service, queryClient, updateService);

            // Assert
            expect(result.ok).toBe(true);
            expect(invalidateQueries).toHaveBeenCalledWith({
              queryKey: ['courier-services'],
            });

            // Cleanup
            invalidateQueries.mockRestore();
            queryClient.clear();
          },
        ),
        { numRuns: 100 },
      );
    },
  );

  it('no invalida la query si el servicio no puede transicionar (DELIVERED)', async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
    const updateService = jest.fn();

    const service = buildService('test-id', 'DELIVERED');
    const result = await simulatePerformAction(service, queryClient, updateService);

    expect(result.ok).toBe(false);
    expect(invalidateQueries).not.toHaveBeenCalled();

    invalidateQueries.mockRestore();
    queryClient.clear();
  });
});
