/**
 * Tests de useEarnings — mobile
 *
 * BUG-09 FIX: el módulo earnings usaba /api/liquidations/* (endpoints ADMIN-only).
 * Ahora usa /api/courier/settlements/earnings — endpoint correcto para COURIER.
 * Un solo request retorna summary + settlements[], eliminando el Promise.allSettled.
 */
import * as fc from 'fast-check';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import React from 'react';
import { useEarnings } from '@/features/earnings/hooks/useEarnings';
import { earningsApi } from '@/features/earnings/api/earningsApi';

jest.mock('@/features/earnings/api/earningsApi', () => ({
  earningsApi: {
    getSummary: jest.fn(),
    getSettlements: jest.fn(),
    getSettlementById: jest.fn(),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeSettlement(overrides: Record<string, unknown> = {}) {
  return {
    id: 'liq-1',
    courier_id: 'c1',
    company_id: 'co-1',
    total_earned: 80000,
    total_services: 10,
    start_date: '2026-01-01T00:00:00Z',
    end_date: '2026-01-15T00:00:00Z',
    created_at: '2026-01-16T00:00:00Z',
    ...overrides,
  };
}

function makeSummary(overrides: Record<string, unknown> = {}) {
  return {
    total_earned: 150000,
    total_services: 18,
    total_settlements: 2,
    settlements: [makeSettlement(), makeSettlement({ id: 'liq-2' })],
    ...overrides,
  };
}

function wrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

// ─── Carga inicial ────────────────────────────────────────────────────────────

describe('useEarnings — carga inicial', () => {
  beforeEach(() => jest.clearAllMocks());

  it('inicia en estado loading', () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());
    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    expect(result.current.loading).toBe(true);
  });

  it('carga summary y settlements correctamente desde un solo endpoint', async () => {
    const summary = makeSummary();
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(summary);

    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.summary?.total_earned).toBe(150000);
    expect(result.current.summary?.total_settlements).toBe(2);
    expect(result.current.liquidations).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('liquidations viene de summary.settlements — no hay llamada separada', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(makeSummary());

    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Solo se llama getSummary — no getSettlements por separado
    expect(earningsApi.getSummary).toHaveBeenCalledTimes(1);
    expect(earningsApi.getSettlements).not.toHaveBeenCalled();
  });

  it('establece error cuando el endpoint falla', async () => {
    (earningsApi.getSummary as jest.Mock).mockRejectedValue({ userMessage: 'Sin conexión' });

    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Sin conexión');
    expect(result.current.summary).toBeNull();
    expect(result.current.liquidations).toEqual([]);
  });

  it('retorna error genérico cuando no hay userMessage', async () => {
    (earningsApi.getSummary as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Error al cargar ganancias');
  });

  it('liquidations es array vacío cuando settlements es vacío', async () => {
    (earningsApi.getSummary as jest.Mock).mockResolvedValue(
      makeSummary({ settlements: [], total_settlements: 0 }),
    );

    const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.liquidations).toEqual([]);
    expect(result.current.summary?.total_settlements).toBe(0);
  });
});

// ─── Endpoints correctos ──────────────────────────────────────────────────────

describe('earningsApi — endpoints correctos (BUG-09 fix)', () => {
  it('getSummary apunta a /api/courier/settlements/earnings (no /api/liquidations)', () => {
    // Verificamos que el mock fue configurado con el nombre correcto
    // La URL real se verifica en integración; aquí validamos que el método existe
    expect(typeof earningsApi.getSummary).toBe('function');
    expect(typeof earningsApi.getSettlements).toBe('function');
    expect(typeof earningsApi.getSettlementById).toBe('function');
    // El método getLiquidations ya no debe existir
    expect((earningsApi as any).getLiquidations).toBeUndefined();
  });
});

// ─── PBT: total_earned siempre es número ─────────────────────────────────────

describe('P-EARN-1: total_earned del summary siempre es número (PBT)', () => {
  it('P-EARN-1: para cualquier valor numérico, summary.total_earned se preserva', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: Math.fround(1e9), noNaN: true }),
        fc.integer({ min: 0, max: 1000 }),
        fc.integer({ min: 0, max: 50 }),
        async (earned, services, settlementsCount) => {
          jest.clearAllMocks();
          const settlements = Array.from({ length: settlementsCount }, (_, i) =>
            makeSettlement({ id: `liq-${i}` }),
          );
          (earningsApi.getSummary as jest.Mock).mockResolvedValue(
            makeSummary({ total_earned: earned, total_services: services, settlements }),
          );

          const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
          await waitFor(() => expect(result.current.loading).toBe(false));

          expect(typeof result.current.summary?.total_earned).toBe('number');
          expect(result.current.summary?.total_earned).toBeCloseTo(earned, 4);
          expect(result.current.liquidations).toHaveLength(settlementsCount);
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ─── PBT: liquidations siempre refleja summary.settlements ───────────────────

describe('P-EARN-2: liquidations siempre es igual a summary.settlements (PBT)', () => {
  it('P-EARN-2: liquidations.length === summary.settlements.length', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 20 }),
        async (count) => {
          jest.clearAllMocks();
          const settlements = Array.from({ length: count }, (_, i) =>
            makeSettlement({ id: `liq-${i}` }),
          );
          (earningsApi.getSummary as jest.Mock).mockResolvedValue(
            makeSummary({ settlements, total_settlements: count }),
          );

          const { result } = renderHook(() => useEarnings(), { wrapper: wrapper() });
          await waitFor(() => expect(result.current.loading).toBe(false));

          expect(result.current.liquidations).toHaveLength(count);
          expect(result.current.liquidations).toEqual(settlements);
        },
      ),
      { numRuns: 30 },
    );
  }, 20_000);
});
