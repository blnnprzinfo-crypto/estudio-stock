import { useCallback, useMemo, useState } from 'react';
import { Button } from '../../components/Button.js';
import { EmptyState } from '../../components/EmptyState.js';
import { QuantityStepper } from '../../components/QuantityStepper.js';
import { groupForPurchase, formatShoppingList } from './shoppingList.js';
import { defaultOrderQty, missingToMinimum, resolvePurchaseAction } from './links.js';
import type { ID, Product, Supplier } from '../../types/index.js';

interface PurchaseListProps {
  products: Product[];
  suppliers: Supplier[];
  onSelect: (id: string) => void;
}

/**
 * Lista de reposición: lo que está en el mínimo o por debajo, por proveedor.
 *
 * La aplicación no habla con las webs de los proveedores. No consulta precios,
 * no lee catálogos y no guarda credenciales de ninguna tienda: solo abre
 * enlaces en el navegador de la usuaria, con su propia sesión.
 */
export function PurchaseList({ products, suppliers, onSelect }: PurchaseListProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Unidades a pedir, ajustadas a mano. Solo lo que se toca entra aquí; el
  // resto usa la cantidad propuesta. No se guarda en la base: es el pedido de
  // este rato, no un dato del producto.
  const [orderQty, setOrderQty] = useState<Map<ID, number>>(new Map());

  const setQty = useCallback((productId: ID, value: number) => {
    setOrderQty((current) => new Map(current).set(productId, value));
  }, []);

  // Misma condición que getLowStockProducts: estar en el mínimo ya cuenta.
  const groups = useMemo(() => {
    const low = products.filter((product) => product.qty <= product.minQty);
    return groupForPurchase(low, suppliers);
  }, [products, suppliers]);

  const total = useMemo(
    () => groups.reduce((sum, group) => sum + group.products.length, 0),
    [groups]
  );

  const copy = async () => {
    setCopyError(null);
    try {
      await navigator.clipboard.writeText(formatShoppingList(groups, orderQty));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError('El navegador no ha dejado copiar. Mantén pulsado el texto para copiarlo a mano.');
    }
  };

  if (total === 0) {
    return (
      <EmptyState
        emoji="✅"
        title="No hay nada que reponer"
        message="Ningún producto está en su mínimo. Aquí aparecerán los que haya que pedir."
      />
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto pb-6">
      <div className="px-4 pb-3">
        <Button variant="secondary" className="w-full" onClick={() => void copy()}>
          {copied ? 'Lista copiada' : 'Copiar la lista'}
        </Button>
        {copyError ? (
          <p role="alert" className="mt-2 text-[13px] font-semibold text-danger">
            {copyError}
          </p>
        ) : null}
      </div>

      {groups.map((group) => (
        <section key={group.supplier?.id ?? 'sin-proveedor'} className="mb-1">
          <h2 className="sticky top-0 z-10 border-y border-line bg-soft px-4 py-2 text-[13px] font-bold">
            {group.title}
            <span className="ml-2 font-semibold text-muted">
              {group.products.length}
            </span>
          </h2>

          {group.products.map((product) => (
            <PurchaseRow
              key={product.id}
              product={product}
              supplier={group.supplier}
              qty={orderQty.get(product.id) ?? defaultOrderQty(product)}
              onQtyChange={setQty}
              onSelect={onSelect}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

interface PurchaseRowProps {
  product: Product;
  supplier: Supplier | null;
  qty: number;
  onQtyChange: (productId: ID, value: number) => void;
  onSelect: (id: string) => void;
}

function PurchaseRow({
  product,
  supplier,
  qty,
  onQtyChange,
  onSelect,
}: PurchaseRowProps) {
  const action = resolvePurchaseAction(product, supplier);
  const missing = missingToMinimum(product);

  // Una pestaña por pulsación. Abrir varias de golpe activa el bloqueador de
  // ventanas emergentes y no se abre ninguna.
  const open = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="grid gap-2 border-b border-line px-4 py-3">
      <button
        type="button"
        onClick={() => onSelect(product.id)}
        className="flex min-h-[44px] w-full min-w-0 items-center gap-3 text-left"
      >
        <span aria-hidden className="grid w-8 shrink-0 place-items-center text-xl">
          {product.emoji}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold">
            {product.name}
          </span>
          <span className="block text-[13px] text-muted tabular-nums">
            quedan {formatNumber(product.qty)} {product.unit} · faltan{' '}
            <strong className="font-bold text-danger">
              {formatNumber(missing)} {product.unit}
            </strong>
          </span>
        </span>
      </button>

      <div className="flex items-center gap-2 pl-11">
        <QuantityStepper
          value={qty}
          unit={product.unit}
          label={product.name}
          onChange={(value) => onQtyChange(product.id, value)}
        />
        <span className="text-[13px] font-semibold text-muted">
          {product.unit} a pedir
        </span>

        <span className="ml-auto">
          {action.kind === 'sin-enlace' ? (
            <span
              title={action.reason}
              className="grid min-h-[44px] shrink-0 place-items-center rounded-lg border border-line px-3 text-[13px] font-semibold text-muted"
            >
              {action.label}
            </span>
          ) : (
            <Button
              variant={action.kind === 'ficha' ? 'primary' : 'secondary'}
              className="shrink-0 px-3 text-[13px]"
              onClick={() => open(action.url)}
            >
              {action.kind === 'ficha' ? 'Abrir' : 'Buscar'}
            </Button>
          )}
        </span>
      </div>
    </div>
  );
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
