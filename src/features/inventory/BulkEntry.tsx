import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../components/Button.js';
import { createProductsBulk } from '../../db/products.js';
import type { Category } from '../../types/index.js';

interface DraftRow {
  key: string;
  name: string;
  categoryId: string;
  qty: string;
  unit: string;
  minQty: string;
  unitCost: string;
}

interface BulkEntryProps {
  categories: Category[];
  onDone: () => void;
}

const CELL =
  'min-h-[44px] w-full rounded-md border border-line bg-white px-2 text-[14px] outline-none focus:border-teal focus:ring-1 focus:ring-teal';

/**
 * Alta rápida para la carga inicial de 150 productos desde el ordenador.
 *
 * Pensada para no soltar el teclado: se avanza entre campos con el tabulador y
 * Enter crea una fila nueva y salta a su primer campo. No hay ventanas que
 * abrir ni cerrar entre producto y producto, y el guardado va en bloque con
 * createProductsBulk, en una sola transacción.
 */
export function BulkEntry({ categories, onDone }: BulkEntryProps) {
  const nextKey = useRef(0);
  const makeRow = useCallback(
    (): DraftRow => ({
      key: `row-${nextKey.current++}`,
      name: '',
      categoryId: categories[0]?.id ?? '',
      qty: '',
      unit: 'ud',
      minQty: '',
      unitCost: '',
    }),
    [categories]
  );

  const [rows, setRows] = useState<DraftRow[]>(() => [makeRow(), makeRow(), makeRow()]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(0);

  // Para devolver el foco al primer campo de la fila recién creada.
  const nameInputs = useRef(new Map<string, HTMLInputElement | null>());
  const [focusKey, setFocusKey] = useState<string | null>(null);

  useEffect(() => {
    if (!focusKey) return;
    nameInputs.current.get(focusKey)?.focus();
    setFocusKey(null);
  }, [focusKey]);

  const set = (key: string, field: keyof Omit<DraftRow, 'key'>, value: string) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row))
    );

  const addRowAfter = (key: string) => {
    const row = makeRow();
    setRows((current) => {
      const index = current.findIndex((candidate) => candidate.key === key);
      const next = [...current];
      next.splice(index + 1, 0, row);
      return next;
    });
    setFocusKey(row.key);
  };

  const removeRow = (key: string) => {
    nameInputs.current.delete(key);
    setRows((current) =>
      current.length === 1 ? [makeRow()] : current.filter((row) => row.key !== key)
    );
  };

  // Enter en cualquier campo de la fila abre la siguiente. Se captura en el
  // contenedor de la fila para que valga también sobre el desplegable.
  const onRowKeyDown = (key: string) => (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addRowAfter(key);
  };

  const filled = rows.filter((row) => row.name.trim() !== '');

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await createProductsBulk(
        filled.map((row) => ({
          name: row.name.trim(),
          brand: null,
          categoryId: row.categoryId,
          supplierId: null,
          format: null,
          qty: toNumber(row.qty),
          minQty: toNumber(row.minQty),
          unit: row.unit.trim() || 'ud',
          unitCost: toNumber(row.unitCost),
          barcode: null,
          emoji: '📦',
          purchasedAt: null,
          expiresAt: null,
          location: null,
          notes: null,
        }))
      );
      setSaved(filled.length);
      nameInputs.current.clear();
      nextKey.current = 0;
      setRows([makeRow(), makeRow(), makeRow()]);
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <p className="mb-3 text-[13px] leading-snug text-muted">
        Tabulador para pasar de campo, Enter para abrir una fila nueva. Las filas
        sin nombre se ignoran al guardar.
      </p>

      {/* El desplazamiento lateral queda dentro de esta caja: la página nunca
          se desborda, aunque la tabla necesite más ancho que un móvil. */}
      <div className="-mx-1 overflow-x-auto px-1">
        <div className="min-w-[620px]">
          <div className="grid grid-cols-[minmax(140px,1fr)_minmax(130px,150px)_70px_70px_70px_80px_36px] gap-1.5 pb-1 text-[12px] font-semibold text-muted">
            <span>Nombre</span>
            <span>Categoría</span>
            <span>Cantidad</span>
            <span>Unidad</span>
            <span>Mínimo</span>
            <span>Coste</span>
            <span />
          </div>

          <div className="grid gap-1.5">
            {rows.map((row) => (
              <div
                key={row.key}
                onKeyDown={onRowKeyDown(row.key)}
                className="grid grid-cols-[minmax(140px,1fr)_minmax(130px,150px)_70px_70px_70px_80px_36px] items-center gap-1.5"
              >
                <input
                  ref={(element) => {
                    nameInputs.current.set(row.key, element);
                  }}
                  value={row.name}
                  onChange={(event) => set(row.key, 'name', event.target.value)}
                  aria-label="Nombre del producto"
                  className={CELL}
                />
                <select
                  value={row.categoryId}
                  onChange={(event) => set(row.key, 'categoryId', event.target.value)}
                  aria-label="Categoría"
                  className={CELL}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.qty}
                  onChange={(event) => set(row.key, 'qty', event.target.value)}
                  aria-label="Cantidad"
                  className={`${CELL} tabular-nums`}
                />
                <input
                  value={row.unit}
                  onChange={(event) => set(row.key, 'unit', event.target.value)}
                  aria-label="Unidad"
                  className={CELL}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.minQty}
                  onChange={(event) => set(row.key, 'minQty', event.target.value)}
                  aria-label="Mínimo"
                  className={`${CELL} tabular-nums`}
                />
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={row.unitCost}
                  onChange={(event) => set(row.key, 'unitCost', event.target.value)}
                  aria-label="Coste"
                  className={`${CELL} tabular-nums`}
                />
                {/* Fuera del recorrido del tabulador a propósito: con 150 filas,
                    seis campos por fila ya son bastantes paradas. */}
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => removeRow(row.key)}
                  aria-label={`Quitar la fila de ${row.name || 'producto sin nombre'}`}
                  className="grid h-[44px] w-[36px] place-items-center rounded-md text-muted active:bg-soft"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-danger">
          {error}
        </p>
      ) : null}

      {saved > 0 && !error ? (
        <p role="status" className="mt-3 text-[14px] font-semibold text-teal">
          {saved} {saved === 1 ? 'producto guardado' : 'productos guardados'}.
        </p>
      ) : null}

      <div className="mt-4 grid gap-2">
        <Button
          variant="primary"
          onClick={save}
          disabled={busy || filled.length === 0}
        >
          Guardar {filled.length > 0 ? `${filled.length} ` : ''}
          {filled.length === 1 ? 'producto' : 'productos'}
        </Button>
        <Button
          variant="secondary"
          onClick={() => addRowAfter(rows[rows.length - 1].key)}
        >
          Añadir fila
        </Button>
      </div>
    </div>
  );
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
