import { useState } from 'react';
import { Button } from '../../components/Button.js';
import { Field, SelectField, TextAreaField } from '../../components/Field.js';
import { createProduct } from '../../db/products.js';
import { safeExternalUrl } from '../purchase/links.js';
import type { Category, Supplier } from '../../types/index.js';

interface ProductFormProps {
  categories: Category[];
  suppliers: Supplier[];
  onDone: () => void;
}

/**
 * Alta individual con todos los campos.
 *
 * La cantidad que se escribe aquí es la cantidad de apertura del producto, y la
 * escribe createProduct junto a su movimiento 'inicial' en una sola
 * transacción. No es una edición de stock: una vez creado, la cantidad ya solo
 * se mueve con applyMovement.
 */
export function ProductForm({ categories, suppliers, onDone }: ProductFormProps) {
  const [form, setForm] = useState({
    name: '',
    brand: '',
    categoryId: categories[0]?.id ?? '',
    supplierId: '',
    supplierUrl: '',
    format: '',
    qty: '0',
    minQty: '0',
    unit: 'ud',
    unitCost: '0',
    barcode: '',
    emoji: '📦',
    purchasedAt: '',
    expiresAt: '',
    location: '',
    notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof typeof form>(key: K, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await createProduct({
        name: form.name.trim(),
        brand: emptyToNull(form.brand),
        categoryId: form.categoryId,
        supplierId: emptyToNull(form.supplierId),
        supplierUrl: emptyToNull(form.supplierUrl),
        format: emptyToNull(form.format),
        qty: toNumber(form.qty),
        minQty: toNumber(form.minQty),
        unit: form.unit.trim() || 'ud',
        unitCost: toNumber(form.unitCost),
        barcode: emptyToNull(form.barcode),
        emoji: form.emoji.trim() || '📦',
        purchasedAt: emptyToNull(form.purchasedAt),
        expiresAt: emptyToNull(form.expiresAt),
        location: emptyToNull(form.location),
        notes: emptyToNull(form.notes),
      });
      onDone();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo crear');
      setBusy(false);
    }
  };

  const canSubmit = form.name.trim() !== '' && form.categoryId !== '' && !busy;

  return (
    <form
      className="min-h-0 flex-1 overflow-y-auto px-4 pb-6"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) void submit();
      }}
    >
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
            required
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

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Cantidad inicial"
            type="number"
            inputMode="decimal"
            hint="Se guarda como movimiento inicial"
            value={form.qty}
            onChange={(event) => set('qty', event.target.value)}
          />
          <Field
            label="Mínimo"
            type="number"
            inputMode="decimal"
            value={form.minQty}
            onChange={(event) => set('minQty', event.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Field
            label="Unidad"
            value={form.unit}
            onChange={(event) => set('unit', event.target.value)}
          />
          <Field
            label="Coste por unidad"
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

      <Button type="submit" variant="primary" className="mt-5 w-full" disabled={!canSubmit}>
        Crear producto
      </Button>
    </form>
  );
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** Avisa en el momento si el enlace pegado no va a servir para abrir la ficha. */
function supplierUrlHint(value: string): string | undefined {
  if (value.trim() === '') {
    return 'Pega aquí la ficha del producto en la tienda. Se guarda una vez y ya no hay que buscarlo más.';
  }
  return safeExternalUrl(value)
    ? undefined
    : 'Este enlace no vale. Tiene que empezar por http:// o https://';
}

function toNumber(value: string): number {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}
