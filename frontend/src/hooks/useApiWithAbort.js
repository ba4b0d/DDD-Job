import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic data loader that:
 * - calls a fetcher (signal) => Promise<AxiosResponse or raw value>
 * - exposes { data, loading, error, reload }
 * - aborts in-flight requests on unmount
 *
 * The fetcher is given the AbortSignal so axios-style clients can pass it through.
 * Errors with code 'ERR_CANCELED' / name 'CanceledError' are swallowed (unmount).
 */
export default function useApiWithAbort(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback((signal) => {
    setLoading(true);
    setError(null);
    const p = fetcherRef.current({ signal });
    if (p && typeof p.then === 'function') {
      p
        .then((res) => {
          if (signal?.aborted) return;
          const value = res && res.data !== undefined ? res.data : res;
          setData(value);
          setLoading(false);
        })
        .catch((err) => {
          if (signal?.aborted) return;
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED') return;
          setError(err.message || 'خطا در بارگذاری');
          setLoading(false);
        });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: load };
}
