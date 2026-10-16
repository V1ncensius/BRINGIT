import { cx, initials as toInitials } from '../../lib/format';

const SIZES = {
  sm: 'h-9 w-9 text-[13px]',
  md: 'h-12 w-12 text-sm',
  lg: 'h-[76px] w-[76px] text-2xl',
};

/** Kotak inisial/logo tim. tone "brand" = tim sendiri (oranye), "neutral" = pihak lain. */
export default function Avatar({ name, initials, src, size = 'md', tone = 'neutral', className = '' }) {
  const text = initials || toInitials(name);
  return (
    <div
      className={cx(
        'grid shrink-0 place-items-center overflow-hidden rounded-lg border font-bold',
        tone === 'brand' ? 'border-brand bg-brand-soft text-brand' : 'border-ink-600 bg-ink-700 text-white',
        SIZES[size],
        className,
      )}
      aria-hidden={!src}
    >
      {src ? <img src={src} alt={`Logo ${name || ''}`} className="h-full w-full object-cover" /> : text}
    </div>
  );
}
