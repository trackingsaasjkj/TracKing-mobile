import { useServicesStore } from '@/features/services/store/servicesStore';
import type { Service } from '@/features/services/types/services.types';

const makeService = (overrides: Partial<Service> = {}): Service => ({
  id: 'svc-1',
  status: 'ASSIGNED',
  origin_address: 'Calle 10 #20-30',
  destination_address: 'Carrera 5 #15-20',
  destination_name: 'Pedro Gómez',
  package_details: 'Caja pequeña',
  payment_method: 'EFECTIVO',
  total_price: 58000,
  delivery_price: 8000,
  product_price: 50000,
  ...overrides,
});

describe('servicesStore', () => {
  beforeEach(() => {
    useServicesStore.setState({ services: [] });
  });

  it('setServices replaces the list', () => {
    const svcs = [makeService({ id: 'a' }), makeService({ id: 'b' })];
    useServicesStore.getState().setServices(svcs);
    expect(useServicesStore.getState().services).toHaveLength(2);
  });

  it('updateService patches the matching service', () => {
    useServicesStore.getState().setServices([makeService({ id: 'svc-1', status: 'ASSIGNED' })]);
    useServicesStore.getState().updateService(makeService({ id: 'svc-1', status: 'ACCEPTED' }));
    expect(useServicesStore.getState().services[0].status).toBe('ACCEPTED');
  });

  it('updateService does not affect other services', () => {
    useServicesStore.getState().setServices([
      makeService({ id: 'svc-1', status: 'ASSIGNED' }),
      makeService({ id: 'svc-2', status: 'ASSIGNED' }),
    ]);
    useServicesStore.getState().updateService(makeService({ id: 'svc-1', status: 'ACCEPTED' }));
    expect(useServicesStore.getState().services[1].status).toBe('ASSIGNED');
  });

  it('updateService ignores unknown ids', () => {
    useServicesStore.getState().setServices([makeService({ id: 'svc-1' })]);
    useServicesStore.getState().updateService(makeService({ id: 'unknown', status: 'DELIVERED' }));
    expect(useServicesStore.getState().services[0].status).toBe('ASSIGNED');
  });
});
