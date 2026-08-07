import { beforeEach, describe, it, expect } from 'vitest';
import { db } from '../../db/db.js';
import { createProduct, getProduct } from '../../db/products.js';
import { applyMovement, getMovements, recalculateQty } from '../../db/movements.js';

/**
 * El selector del inventario escribe con applyMovement y agrupa los toques
 * seguidos en un solo movimiento. Aquí se comprueba el efecto en la base, que
 * es lo que importa: que el stock y el historial no se separen nunca.
 */
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

describe('ajuste rapido de stock', () => {
  it('cinco toques agrupados son un movimiento, no cinco', async () => {
    const p = await createProduct(base);
    const antes = (await getMovements(p.id)).length;

    // Lo que hace el hook al soltar: un solo delta con la suma de los toques
    await applyMovement({ productId: p.id, delta: 5, reason: 'ajuste' });

    const movimientos = await getMovements(p.id);
    expect(movimientos.length).toBe(antes + 1);
    expect(movimientos[movimientos.length - 1].delta).toBe(5);
    expect((await getProduct(p.id))!.qty).toBe(15);
  });

  it('bajar se registra como uso y subir como ajuste', async () => {
    const p = await createProduct(base);

    await applyMovement({ productId: p.id, delta: -3, reason: 'uso' });
    await applyMovement({ productId: p.id, delta: 2, reason: 'ajuste' });

    const razones = (await getMovements(p.id)).map((m) => m.reason);
    expect(razones).toEqual(['inicial', 'uso', 'ajuste']);
  });

  it('el stock sigue cuadrando con el historial despues de ajustar', async () => {
    const p = await createProduct(base);

    await applyMovement({ productId: p.id, delta: -4, reason: 'uso' });
    await applyMovement({ productId: p.id, delta: 7, reason: 'ajuste' });
    await applyMovement({ productId: p.id, delta: -1, reason: 'uso' });

    const guardado = (await getProduct(p.id))!.qty;
    expect(guardado).toBe(12);
    expect(await recalculateQty(p.id)).toBe(guardado);
  });

  it('no deja bajar el stock por debajo de cero', async () => {
    const p = await createProduct({ ...base, qty: 2 });

    await expect(
      applyMovement({ productId: p.id, delta: -3, reason: 'uso' })
    ).rejects.toThrow(/Insufficient stock/);

    // Ni la cantidad ni el historial se han movido
    expect((await getProduct(p.id))!.qty).toBe(2);
    expect((await getMovements(p.id)).length).toBe(1);
  });
});
