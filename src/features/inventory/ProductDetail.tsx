import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { Field, SelectField, TextAreaField } from '../../components/Field.js';
import { ConfirmDialog } from '../../components/ConfirmDialog.js';
import {
  duplicateProduct,
  softDeleteProduct,
  updateProduct,
} from '../../db/products.js';
import { safeExternalUrl } from '../purchase/links.js';
import type { Category, Product, Supplier } from '../../types/index.js';

interface ProductDetailProps {
  product: Product;
  categories: Category[];
  suppliers: Supplier[];
  onDone: () => void;
}

/**
 * Detalle y edición de un producto.
 *
 * La cantidad se muestra pero NO se edita: no hay ningún campo enlazado a qty
 * y updateProduct ni siquiera la acepta. El stock se mueve en la Fase 3.
 */
export function ProductDetail({
  product,
  categories,
  suppliers,
  onDone,
}: ProductDetailProps) {
  const [form, setForm] = useState({
    name: product.name,
    brand: product.brand ?? '',
    categoryId: product.categoryId,
    supplierId: product.supplierId ?? '',
    supplierUrl: product.supplierUrl ?? '',
    format: product.format ?? '',
    minQty: String(product.minQty),
    unit: product.unit,
    unitCost: String(product.unitCost),
    barcode: product.barcode ?? '',
    emoji: product.emoji,
    purchasedAt: product.purchasedAt ?? '',
    expiresAt: product.expiresAt ?? '',
    location: product.location ?? '',
    notes: product.notes ?? '',
  });
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar');
      setBusy(false);
    }
  };

  const save = () =>
    run(() =>
      updateProduct(product.id, {
        name: form.name.trim(),
        brand: emptyToNull(form.brand),
        categoryId: form.categoryId,
        supplierId: emptyToNull(form.supplierId),
        supplierUrl: emptyToNull(form.supplierUrl),
        format: emptyToNull(form.format),
        minQty: toNumber(form.minQty),
        unit: form.unit.trim() || 'ud',
        unitCost: toNumber(form.unitCost),
        barcode: emptyToNull(form.barcode),
        emoji: form.emoji.trim() || '📦',
        purchasedAt: emptyToNull(form.purchasedAt),
        expiresAt: emptyToNull(form.expiresAt),
        location: emptyToNull(form.location),
        notes: emptyToNull(form.notes),
      })
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6">
      <div className="mb-4 flex items-center justify-between rounded-xl bg-soft px-4 py-3">
        <div>
          <p className="text-[13px] font-semibold text-muted">Cantidad actual</p>
          <p className="text-[24px] font-black tabular-nums">
            {product.qty}
            <span className="ml-1 text-[15px] font-semibold text-muted">
              {product.unit}
            </span>
          </p>
        </div>
        <p className="max-w-[18ch] text-right text-[12px] leading-snug text-muted">
          Se cambia con movimientos, no desde aquí
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid grid-cols-[84px_1fr] gap-2">
          <Field
            label="Emoji"
            value={form.emoji}
            onChange={(event) => set('emoji', event.target.value)}
            className="text-center text-2xl"
          />
          <Field
            label="Nombre"
            value={form.name}
            onChange={(event) => set('name', event.target.value)}
          />
        </div>

        <SelectField
          label="Categoría"
          value={form.categoryId}
          onChange={(event) => set('categoryId', event.target.value)}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.emoji} {category.name}
            </option>
          ))}
        </SelectField>

        <SelectField
          label="Proveedor"
          value={form.supplierId}
          onChange={(event) => set('supplierId', event.target.value)}
        >
          <option value="">Sin proveedor</option>
          {suppliers.map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </SelectField>

        <Field
          label="Enlace del proveedor"
          type="url"
          inputMode="url"
          placeholder="https://..."
          hint={supplierUrlHint(form.supplierUrl)}
          value={form.supplierUrl}
          onChange={(event) => set('supplierUrl', event.target.value)}
        />

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Marca"
            value={form.brand}
            onChange={(event) => set('brand', event.target.value)}
          />
          <Field
            label="Formato"
            value={form.format}
            onChange={(event) => set('format', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Field
            label="Mínimo"
            type="number"
            inputMode="decimal"
            value={form.minQty}
            onChange={(event) => set('minQty', event.target.value)}
          />
          <Field
            label="Unidad"
            value={form.unit}
            onChange={(event) => set('unit', event.target.value)}
          />
          <Field
            label="Coste"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={form.unitCost}
            onChange={(event) => set('unitCost', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Comprado el"
            type="date"
            value={form.purchasedAt}
            onChange={(event) => set('purchasedAt', event.target.value)}
          />
          <Field
            label="Caduca el"
            type="date"
            value={form.expiresAt}
            onChange={(event) => set('expiresAt', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Ubicación"
            value={form.location}
            onChange={(event) => set('location', event.target.value)}
          />
          <Field
            label="Código de barras"
            value={form.barcode}
            onChange={(event) => set('barcode', event.target.value)}
          />
        </div>

        <TextAreaField
          label="Notas"
          value={form.notes}
          onChange={(value) => set('notes', value)}
        />
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-[14px] font-semibold text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-5 grid gap-2">
        <Button variant="primary" onClick={save} disabled={busy || !form.name.trim()}>
          Guardar
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              run(() => duplicateProduct(product.id, `${product.name} (copia)`))
            }
          >
            Duplicar
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onClick={() => setConfirmingDelete(true)}
          >
            Borrar
          </Button>
        </div>
      </div>

      {confirmingDelete ? (
        <ConfirmDialog
          title="¿Borrar producto?"
          message={`"${product.name}" desaparecerá del inventario. Su historial de movimientos se conserva.`}
          confirmLabel="Borrar"
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            void run(() => softDeleteProduct(product.id));
          }}
        />
      ) : null}
    </div>
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Avisa en el momento si el enlace pegado no va a servir para abrir la ficha. */
function supplierUrlHint(value: string): string | undefined {
  if (value.trim() === '') {
    return 'Pega aquí la ficha del producto en la tienda. La lista de compra la abrirá directamente.';
  }
  return safeExternalUrl(value)
    ? undefined
    : 'Este enlace no vale. Tiene que empezar por http:// o https://';
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
