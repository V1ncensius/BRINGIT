import { forwardRef, useId } from 'react';
import { cx } from '../../lib/format';

/** Pembungkus label + kontrol + pesan error/hint. */
export function Field({ label, error, hint, children, className = '', htmlFor }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

const withField = (Tag, base) =>
  forwardRef(function Control({ label, error, hint, className = '', wrapClass = '', children, ...props }, ref) {
    const auto = useId();
    const id = props.id || auto;
    return (
      <Field label={label} error={error} hint={hint} className={wrapClass} htmlFor={id}>
        <Tag ref={ref} id={id} aria-invalid={!!error || undefined} className={cx(base, error && 'input-error', className)} {...props}>
          {children}
        </Tag>
      </Field>
    );
  });

export const Input = withField('input', 'input');
export const Select = withField('select', 'select');
export const Textarea = withField('textarea', 'input min-h-[84px] resize-y sm:min-h-[52px]');
