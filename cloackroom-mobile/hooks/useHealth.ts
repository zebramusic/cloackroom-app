import { useCallback, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api';
import type { HealthResponse } from '@/lib/types';

type RefetchOptions = {
  throwOnError?: boolean;
};

type RefetchResult = {
  data?: HealthResponse;
  error?: unknown;
};

export function useHealth() {
  const [data, setData] = useState<HealthResponse | undefined>(undefined);
  const [error, setError] = useState<unknown>(null);
  const [isFetching, setIsFetching] = useState(false);
  const inFlightRef = useRef<Promise<RefetchResult> | null>(null);

  const refetch = useCallback(
    async (options?: RefetchOptions): Promise<RefetchResult> => {
      if (inFlightRef.current) {
        return inFlightRef.current;
      }
      setIsFetching(true);
      setError(null);
      const run = (async () => {
        try {
          const result = await apiFetch<HealthResponse>('/api/health');
          setData(result);
          return { data: result } as RefetchResult;
        } catch (err) {
          setError(err);
          if (options?.throwOnError) throw err;
          return { error: err } as RefetchResult;
        } finally {
          setIsFetching(false);
          inFlightRef.current = null;
        }
      })();
      inFlightRef.current = run;
      return run;
    },
    []
  );

  return {
    data,
    error,
    isFetching,
    refetch,
  };
}
