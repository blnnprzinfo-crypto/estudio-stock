interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  unit: string;
  label: string;
  min?: number;
  max?: number;
}

/**
 * Selector de cantidad, como el de la ficha de producto de la tienda.
 *
 * Cuenta unidades a pedir, nunca stock: el stock solo se mueve con
 * applyMovement. Los dos botones miden 44 px porque se usa con guantes.
 */
export function QuantityStepper({
  value,
  onChange,
  unit,
  label,
  min = 1,
  max = 999,
}: QuantityStepperProps) {
  const clamp = (next: number) => Math.min(max, Math.max(min, next));

  return (
    <div
      className="flex shrink-0 items-stretch overflow-hidden rounded-lg border border-line"
      role="group"
      aria-label={label}
    >
      <button
        type="button"
        onClick={() => onChange(clamp(value - 1))}
        disabled={value <= min}
        aria-label={`Quitar una unidad de ${label}`}
        className="grid h-[44px] w-[38px] place-items-center text-[20px] font-bold text-teal active:bg-soft disabled:text-line"
      >
        −
      </button>

      <span
        aria-live="polite"
        className="grid h-[44px] min-w-[46px] place-items-center border-x border-line px-1 text-[15px] font-bold tabular-nums"
      >
        {value}
        <span className="sr-only"> {unit}</span>
      </span>

      <button
        type="button"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
        aria-label={`Añadir una unidad de ${label}`}
        className="grid h-[44px] w-[38px] place-items-center text-[20px] font-bold text-teal active:bg-soft disabled:text-line"
      >
        +
      </button>
    </div>
  );
}
