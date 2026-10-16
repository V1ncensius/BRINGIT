import { cx } from '../../lib/format';

/** Tab bergaris bawah sesuai desain. items: [{ value, label }] */
export default function Tabs({ items, value, onChange, className = '' }) {
  return (
    <div className={cx('scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0', className)}>
      <div role="tablist" className="flex min-w-max gap-7 border-b border-ink-600">
        {items.map((t) => {
          const active = t.value === value;
          return (
            <button
              key={t.value}
              role="tab"
              aria-selected={active}
              onClick={() => onChange(t.value)}
              className={cx(
                '-mb-px border-b-2 pb-3 pt-1 text-[15px] font-medium transition-colors',
                active ? 'border-brand text-white' : 'border-transparent text-muted hover:text-zinc-200',
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
