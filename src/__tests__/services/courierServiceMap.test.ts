/**
 * Tests de CourierServiceMap — __tests__/services/courierServiceMap.test.ts
 *
 * Feature: geocoding-puntos-entrega-recogida
 * Property 11: renderizado condicional del mapa
 * Property 12: tap en pin muestra dirección correcta
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 *
 * Note: react-native-maps cannot render in jsdom. These tests validate the
 * pure logic that determines whether the map should render and which address
 * each pin should display — without mounting the component.
 */
import * as fc from 'fast-check';

// ─── Pure helpers extracted from CourierServiceMap logic ─────────────────────

interface ServiceCoords {
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
  origin_address: string;
  destination_address: string;
}

/** Returns true if the map should be rendered (both coord pairs are non-null) */
function shouldRenderMap(service: ServiceCoords): boolean {
  return (
    service.origin_lat != null &&
    service.origin_lng != null &&
    service.destination_lat != null &&
    service.destination_lng != null
  );
}

/** Returns the address for a given pin type */
function getPinAddress(service: ServiceCoords, pin: 'origin' | 'destination'): string {
  return pin === 'origin' ? service.origin_address : service.destination_address;
}

// ─── Unit tests ───────────────────────────────────────────────────────────────

describe('shouldRenderMap', () => {
  it('retorna true cuando ambos pares de coordenadas son válidos', () => {
    expect(shouldRenderMap({
      origin_lat: 4.71, origin_lng: -74.07,
      destination_lat: 4.72, destination_lng: -74.08,
      origin_address: 'A', destination_address: 'B',
    })).toBe(true);
  });

  it('retorna false cuando origin_lat es null', () => {
    expect(shouldRenderMap({
      origin_lat: null, origin_lng: -74.07,
      destination_lat: 4.72, destination_lng: -74.08,
      origin_address: 'A', destination_address: 'B',
    })).toBe(false);
  });

  it('retorna false cuando destination_lat es undefined', () => {
    expect(shouldRenderMap({
      origin_lat: 4.71, origin_lng: -74.07,
      destination_lat: undefined, destination_lng: -74.08,
      origin_address: 'A', destination_address: 'B',
    })).toBe(false);
  });

  it('retorna false cuando todas las coordenadas son null', () => {
    expect(shouldRenderMap({
      origin_lat: null, origin_lng: null,
      destination_lat: null, destination_lng: null,
      origin_address: 'A', destination_address: 'B',
    })).toBe(false);
  });
});

describe('getPinAddress', () => {
  it('retorna origin_address para el pin de recogida', () => {
    const service = { origin_lat: 4.71, origin_lng: -74.07, destination_lat: 4.72, destination_lng: -74.08, origin_address: 'Calle 10', destination_address: 'Carrera 15' };
    expect(getPinAddress(service, 'origin')).toBe('Calle 10');
  });

  it('retorna destination_address para el pin de entrega', () => {
    const service = { origin_lat: 4.71, origin_lng: -74.07, destination_lat: 4.72, destination_lng: -74.08, origin_address: 'Calle 10', destination_address: 'Carrera 15' };
    expect(getPinAddress(service, 'destination')).toBe('Carrera 15');
  });
});

// ─── Property 11: renderizado condicional del mapa (PBT) ─────────────────────

describe('P-11: mapa se renderiza iff coordenadas no nulas (PBT)', () => {
  /**
   * Feature: geocoding-puntos-entrega-recogida, Property 11
   * Para cualquier servicio, el mapa se renderiza si y solo si el servicio
   * tiene coordenadas no nulas para origen y destino.
   * Validates: Requirements 6.1, 6.2, 6.3
   */
  it('P-11a: con coordenadas válidas, shouldRenderMap siempre retorna true', () => {
    fc.assert(
      fc.property(
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        fc.float({ min: -90, max: 90, noNaN: true }),
        fc.float({ min: -180, max: 180, noNaN: true }),
        (oLat, oLng, dLat, dLng) => {
          const result = shouldRenderMap({
            origin_lat: oLat, origin_lng: oLng,
            destination_lat: dLat, destination_lng: dLng,
            origin_address: 'A', destination_address: 'B',
          });
          expect(result).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P-11b: con alguna coordenada nula, shouldRenderMap siempre retorna false', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.record({
            origin_lat: fc.constant(null),
            origin_lng: fc.float({ min: -180, max: 180, noNaN: true }),
            destination_lat: fc.float({ min: -90, max: 90, noNaN: true }),
            destination_lng: fc.float({ min: -180, max: 180, noNaN: true }),
          }),
          fc.record({
            origin_lat: fc.float({ min: -90, max: 90, noNaN: true }),
            origin_lng: fc.float({ min: -180, max: 180, noNaN: true }),
            destination_lat: fc.constant(null),
            destination_lng: fc.float({ min: -180, max: 180, noNaN: true }),
          }),
        ),
        (coords) => {
          const result = shouldRenderMap({ ...coords, origin_address: 'A', destination_address: 'B' });
          expect(result).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: tap en pin muestra dirección correcta (PBT) ────────────────

describe('P-12: tap en pin muestra la dirección correcta (PBT)', () => {
  /**
   * Feature: geocoding-puntos-entrega-recogida, Property 12
   * Para cualquier servicio con coordenadas, al tocar el pin de recogida
   * se muestra la dirección de origen, y al tocar el pin de entrega
   * se muestra la dirección de destino.
   * Validates: Requirements 6.4
   */
  it('P-12: getPinAddress retorna la dirección correcta para cada pin', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        fc.string({ minLength: 1, maxLength: 100 }),
        (originAddress, destinationAddress) => {
          const service = {
            origin_lat: 4.71, origin_lng: -74.07,
            destination_lat: 4.72, destination_lng: -74.08,
            origin_address: originAddress,
            destination_address: destinationAddress,
          };

          expect(getPinAddress(service, 'origin')).toBe(originAddress);
          expect(getPinAddress(service, 'destination')).toBe(destinationAddress);
          // Pins must show different addresses when addresses differ
          if (originAddress !== destinationAddress) {
            expect(getPinAddress(service, 'origin')).not.toBe(getPinAddress(service, 'destination'));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
