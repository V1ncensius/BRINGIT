export default function StatCard({ label, value, note, noteClass = 'text-muted', loading }) {
  return (
    <div className="card px-6 py-6">
      <p className="text-[15px] text-muted">{label}</p>
      {loading ? (
        <div className="mt-3 h-8 w-24 animate-pulse rounded bg-ink-700" />
      ) : (
        <p className="mt-1.5 text-[32px] font-bold leading-tight tracking-tight text-white">{value}</p>
      )}
      {note && <p className={`mt-1.5 text-[13px] ${noteClass}`}>{note}</p>}
    </div>
  );
}
