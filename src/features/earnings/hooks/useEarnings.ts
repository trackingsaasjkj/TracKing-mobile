import { useCallback, useEffect, useState } from 'react';
import { earningsApi, type EarningsSummary, type Liquidation } from '../api/earningsApi';

interface EarningsState {
  summary: EarningsSummary | null;
  liquidations: Liquidation[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useEarnings(): EarningsState {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [liquidations, setLiquidations] = useState<Liquidation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryData, liquidationsData] = await Promise.all([
        earningsApi.getSummary(),
        earningsApi.getLiquidations(),
      ]);
      setSummary(summaryData);
      setLiquidations(liquidationsData);
    } catch (err: any) {
      setError(err?.userMessage ?? 'Error al cargar ganancias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { summary, liquidations, loading, error, refresh: load };
}
