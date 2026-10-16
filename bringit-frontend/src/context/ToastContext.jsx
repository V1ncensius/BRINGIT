import { createContext, useCallback, useContext, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';

const ToastContext = createContext(() => {});

const ICON = { success: CircleCheck, error: CircleAlert, info: Info };
const TONE = {
  success: 'border-ok/30 text-ok',
  error: 'border-danger/40 text-danger',
  info: 'border-brand/40 text-brand-text',
};

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => setItems((xs) => xs.filter((t) => t.id !== id)), []);

  const toast = useCallback(
    (message, tone = 'success') => {
      const id = Math.random().toString(36).slice(2);
      setItems((xs) => [...xs.slice(-2), { id, message, tone }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:px-6">
        {items.map((t) => {
          const Icon = ICON[t.tone] || Info;
          return (
            <div key={t.id} role="status" className={`pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-ink-800 px-4 py-3 shadow-pop ${TONE[t.tone]}`}>
              <Icon size={18} className="mt-0.5 shrink-0" />
              <p className="flex-1 text-sm text-zinc-100">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-white" aria-label="Tutup notifikasi">
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
