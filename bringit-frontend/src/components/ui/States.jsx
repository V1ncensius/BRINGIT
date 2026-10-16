import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react';

export function Spinner({ size = 18, className = '' }) {
  return <LoaderCircle size={size} className={`animate-spin ${className}`} aria-hidden />;
}

export function LoadingBlock({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Memuat">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 animate-pulse rounded-md bg-ink-750" />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      {Icon && (
        <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-ink-700 text-muted">
          <Icon size={22} />
        </div>
      )}
      <p className="font-semibold text-white">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <CircleAlert className="mb-3 text-danger" size={26} />
      <p className="font-semibold text-white">Data gagal dimuat</p>
      <p className="mt-1 text-sm text-muted">{error?.message || 'Terjadi gangguan sistem.'}</p>
      {onRetry && (
        <button onClick={onRetry} className="btn-secondary btn-sm mt-4">
          <RefreshCw size={15} /> Muat ulang
        </button>
      )}
    </div>
  );
}
