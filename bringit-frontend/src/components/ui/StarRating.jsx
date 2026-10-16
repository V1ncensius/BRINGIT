import { Star } from 'lucide-react';

/** Input rating bintang (UC-11) — bisa dipakai dengan keyboard. */
export function StarInput({ value, onChange, size = 26 }) {
  return (
    <div role="radiogroup" aria-label="Rating" className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} bintang`}
          onClick={() => onChange(n)}
          className="rounded p-0.5 transition-transform hover:scale-110"
        >
          <Star size={size} className={n <= value ? 'fill-brand text-brand' : 'text-ink-500'} />
        </button>
      ))}
    </div>
  );
}

/** Tampilan "★ 4,9 (28)" */
export function RatingText({ rating, count, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[15px] text-warn ${className}`}>
      <Star size={14} className="fill-warn" />
      {String(rating ?? 0).replace('.', ',')}
      {count != null && <span>({count})</span>}
    </span>
  );
}
