/**
 * Tests de regresión de la auditoría de Fase 1.
 *
 * Estos tests describen el comportamiento CORRECTO.
 * Ahora mismo FALLAN a propósito: son la definición de "arreglado".
 * No los modifiques para que pasen. Arregla el código hasta que pasen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createProduct,
  updateProduct,
  getProduct,
  getLowStockProducts,
} from './products.js';
import { recalculateQty } from './movements.js';
import { db } from './db.js';

const base = {
  name: 'Cartuchos 1203RL',
  brand: null,
  categoryId: 'c1',
  supplierId: null,
  format: null,
  qty: 10,
  minQty: 5,
  unit: 'ud',
  unitCost: 1,
  barcode: null,
  emoji: '📦',
  purchasedAt: null,
  expiresAt: null,
  location: null,
  notes: null,
};

beforeEach(async () => {
  await db.products.clear();
  await db.movements.clear();
});

describe('Regla 1: el stock solo cambia por applyMovement', () => {
  it('updateProduct rechaza cualquier intento de cambiar qty', async () => {
    const p = await createProduct(base);

    await expect(
      // @ts-expect-error qty no debe estar permitido en el tipo de updateProduct
      updateProduct(p.id, { qty: 999 })
    ).rejects.toThrow();

    const after = await getProduct(p.id);
    expect(after!.qty).toBe(10);
  });

  it('updateProduct sigue permitiendo editar el resto de campos', async () => {
    const p = await createProduct(base);
    const updated = await updateProduct(p.id, { name: 'Cartuchos 1205RL' });
    expect(updated.name).toBe('Cartuchos 1205RL');
    expect(updated.qty).toBe(10);
  });
});

describe('Regla 2: recalculateQty repara, no solo informa', () => {
  it('deja la cantidad guardada igual a la suma del historial', async () => {
    const p = await createProduct({ ...base, qty: 10 });

    // Simulamos una desviación (corrupción, fallo de sincronización, etc.)
    await db.products.update(p.id, { qty: 500 });

    const result = await recalculateQty(p.id);

    expect(result).toBe(10);
    const after = await getProduct(p.id);
    expect(after!.qty).toBe(10);
  });

  it('no oculta una suma negativa detrás de un cero', async () => {
    const p = await createProduct({ ...base, qty: 10 });
    await db.movements.add({
      id: 'mov-corrupto',
      productId: p.id,
      delta: -50,
      reason: 'ajuste',
      qtyAfter: 0,
      unitCost: null,
      note: 'movimiento corrupto de prueba',
      createdAt: new Date().toISOString(),
      userId: null,
      deviceId: 'test',
    });

    // La suma real es -40. Debe salir a la luz, no taparse con Math.max(0, ...)
    await expect(recalculateQty(p.id)).rejects.toThrow();
  });
});

describe('Regla 3: llegar al mínimo cuenta como stock bajo', () => {
  it('un producto exactamente en el mínimo aparece como bajo', async () => {
    await createProduct({ ...base, name: 'Justo en minimo', qty: 5, minQty: 5 });
    const low = await getLowStockProducts();
    expect(low.some((p) => p.name === 'Justo en minimo')).toBe(true);
  });

  it('un producto por encima del mínimo no aparece', async () => {
    await createProduct({ ...base, name: 'De sobra', qty: 20, minQty: 5 });
    const low = await getLowStockProducts();
    expect(low.some((p) => p.name === 'De sobra')).toBe(false);
  });
});
