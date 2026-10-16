import { Spinner } from './States';

/** Tombol dengan status loading. variant: primary | secondary | ghost */
export default function Button({ variant = 'primary', size, loading, children, className = '', disabled, ...props }) {
  const cls = [`btn-${variant}`, size === 'sm' && 'btn-sm', size === 'lg' && 'btn-lg', className].filter(Boolean).join(' ');
  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading && <Spinner size={16} />}
      {children}
    </button>
  );
}
