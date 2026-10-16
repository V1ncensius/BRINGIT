import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Memuat data async dengan state loading/error dan fungsi reload.
 * `deps` memicu pemuatan ulang otomatis.
 */
export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const alive = useRef(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(async (silent = false) => {
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fnRef.current();
      if (alive.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      if (alive.current) setState((s) => ({ ...s, loading: false, error }));
      return null;
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    run();
    return () => {
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    ...state,
    reload: () => run(true),
    setData: (updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })),
  };
}

/**
 * Menjalankan aksi (submit) dengan state `busy`. Error ditampilkan lewat toast
 * dan fungsi mengembalikan `undefined` (tidak melempar), jadi pemanggil cukup
 * memeriksa hasilnya.
 */
export function useAction(toast) {
  const [busy, setBusy] = useState(null);
  const run = useCallback(
    async (key, fn, { success, onError } = {}) => {
      setBusy(key);
      try {
        const res = await fn();
        const msg = typeof success === 'function' ? success(res) : success ?? res?.message;
        if (msg && toast) toast(msg, 'success');
        return res;
      } catch (e) {
        if (toast) toast(e.message || 'Terjadi kesalahan.', 'error');
        onError?.(e);
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [toast],
  );
  return [busy, run];
}
