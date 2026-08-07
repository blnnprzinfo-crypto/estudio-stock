import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal text-white border-teal',
  secondary: 'bg-white text-ink border-line',
  danger: 'bg-white text-danger border-danger',
  ghost: 'bg-transparent text-muted border-transparent',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

/** Botón base. La altura mínima de 44 px es la regla táctil de la Fase 2. */
export function Button({
  variant = 'secondary',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`min-h-[44px] rounded-lg border px-4 text-[15px] font-semibold transition-opacity active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
