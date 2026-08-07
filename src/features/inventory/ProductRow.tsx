import { memo } from 'react';
import type { ID, Product } from '../../types/index.js';

interface ProductRowProps {
  product: Product;
  categoryName: string;
  /** Ajuste tocado pero todavía sin escribir en la base. */
  pendingDelta: number;
  onAdjust: (productId: ID, step: number, currentQty: number) => void;
  onSelect: (id: string) => void;
}

/**
 * Una fila del inventario, con ajuste rápido de cantidad.
 *
 * Va envuelta en memo porque al teclear en el buscador se recalcula la lista
 * filtrada: sin esto, React redibujaría las 150 filas en cada pulsación.
 * onSelect y onAdjust llegan estables desde InventoryList (useCallback) y
 * pendingDelta solo cambia en la fila que se está tocando, así que las demás
 * no se vuelven a dibujar.
 */
export const ProductRow = memo(function ProductRow({
  product,
  categoryName,
  pendingDelta,
  onAdjust,
  onSelect,
}: ProductRowProps) {
  // Lo que se ve es la cantidad guardada más lo tocado hace un momento, para
  // que el número responda al instante sin esperar a la base.
  const shown = product.qty + pendingDelta;
  const isLow = shown <= product.minQty;
  const detail = [product.brand, product.format].filter(Boolean).join(' · ');

  return (
    <div className="flex items-center gap-2 border-b border-line px-3 py-2">
      <button
        type="button"
        onClick={() => onSelect(product.id)}
        className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span aria-hidden className="grid w-8 shrink-0 place-items-center text-xl">
          {product.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">
            {product.name}
          </span>
          <span className="block truncate text-[12px] text-muted">
            {detail ? `${detail} · ${categoryName}` : categoryName}
          </span>
        </span>
      </button>

      <div className="flex shrink-0 items-center">
        <button
          type="button"
          onClick={() => onAdjust(product.id, -1, product.qty)}
          disabled={shown <= 0}
          aria-label={`Quitar una unidad de ${product.name}`}
          className="grid h-[44px] w-[36px] place-items-center rounded-l-lg border border-line text-[19px] font-bold text-teal active:bg-soft disabled:text-line"
        >
          −
        </button>

        <span
          aria-live="polite"
          aria-label={`${product.name}: ${formatQty(shown)} ${product.unit}`}
          className={`grid h-[44px] min-w-[52px] place-items-center border-y border-line px-1 text-center leading-none ${
            pendingDelta !== 0 ? 'bg-soft' : ''
          }`}
        >
          <span
            className={`text-[16px] font-black tabular-nums ${
              isLow ? 'text-danger' : 'text-ink'
            }`}
          >
            {formatQty(shown)}
          </span>
          <span className="text-[10px] font-semibold text-muted">
            {product.unit} · mín {formatQty(product.minQty)}
          </span>
        </span>

        <button
          type="button"
          onClick={() => onAdjust(product.id, 1, product.qty)}
          aria-label={`Añadir una unidad de ${product.name}`}
          className="grid h-[44px] w-[36px] place-items-center rounded-r-lg border border-line text-[19px] font-bold text-teal active:bg-soft"
        >
          +
        </button>
      </div>
    </div>
  );
});

/** Evita colas de decimales tipo 7.750000000000001 en pantalla. */
function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
