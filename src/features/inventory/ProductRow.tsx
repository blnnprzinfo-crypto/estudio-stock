import { memo } from 'react';
import type { Product } from '../../types/index.js';

interface ProductRowProps {
  product: Product;
  categoryName: string;
  onSelect: (id: string) => void;
}

/**
 * Una fila del inventario.
 *
 * Va envuelta en memo porque al teclear en el buscador se recalcula la lista
 * filtrada: sin esto, React redibujaría las 150 filas en cada pulsación.
 * onSelect llega estable desde InventoryList (useCallback) para que memo sirva.
 */
export const ProductRow = memo(function ProductRow({
  product,
  categoryName,
  onSelect,
}: ProductRowProps) {
  const isLow = product.qty <= product.minQty;

  const detail = [product.brand, product.format].filter(Boolean).join(' · ');

  return (
    <button
      type="button"
      onClick={() => onSelect(product.id)}
      className="flex min-h-[44px] w-full items-center gap-3 border-b border-line px-4 py-3 text-left active:bg-soft"
    >
      <span aria-hidden className="grid w-9 shrink-0 place-items-center text-2xl">
        {product.emoji}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold">
          {product.name}
        </span>
        <span className="block truncate text-[13px] text-muted">
          {detail ? `${detail} · ${categoryName}` : categoryName}
        </span>
      </span>

      <span className="shrink-0 text-right">
        <span
          className={`block text-[17px] font-black tabular-nums ${
            isLow ? 'text-danger' : 'text-ink'
          }`}
        >
          {formatQty(product.qty)}
          <span className="ml-1 text-[13px] font-semibold text-muted">
            {product.unit}
          </span>
        </span>
        <span className="block text-[12px] text-muted tabular-nums">
          mín. {formatQty(product.minQty)}
        </span>
      </span>
    </button>
  );
});

/** Evita colas de decimales tipo 7.750000000000001 en pantalla. */
function formatQty(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
