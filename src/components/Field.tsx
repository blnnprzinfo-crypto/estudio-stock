import { useId } from 'react';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

const CONTROL =
  'min-h-[48px] w-full rounded-lg border border-line bg-white px-3 text-[15px] outline-none focus:border-teal';

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
}

export function Field({ label, hint, className = '', ...rest }: FieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <input id={id} className={`${CONTROL} ${className}`} {...rest} />
      {hint ? <span className="text-[12px] text-muted">{hint}</span> : null}
    </label>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  children: ReactNode;
}

export function SelectField({
  label,
  children,
  className = '',
  ...rest
}: SelectFieldProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <select id={id} className={`${CONTROL} ${className}`} {...rest}>
        {children}
      </select>
    </label>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}

export function TextAreaField({ label, value, onChange, rows = 3 }: TextAreaProps) {
  const id = useId();
  return (
    <label htmlFor={id} className="grid gap-1.5">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <textarea
        id={id}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-line bg-white p-3 text-[15px] outline-none focus:border-teal"
      />
    </label>
  );
}
