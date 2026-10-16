/** Baris label–nilai (dipakai di panel detail & ringkasan pembayaran). */
export default function SummaryRow({ label, value, strong, valueClass = '' }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5">
      <span className={strong ? 'font-semibold text-white' : 'text-[15px] text-muted'}>{label}</span>
      <span className={`${strong ? 'text-xl font-bold text-white' : 'text-[15px] text-zinc-100'} text-right ${valueClass}`}>{value}</span>
    </div>
  );
}
