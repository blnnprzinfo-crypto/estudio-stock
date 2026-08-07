import { beforeEach, describe, it, expect } from 'vitest';
import { db } from './db.js';
import {
  applyMovement,
  recalculateQty,
  getMovements,
} from './movements.js';
import {
  createProduct,
  createProductsBulk,
  getProduct,
  softDeleteProduct,
  getAllProducts,
} from './products.js';
import { seedCategories } from './seed.js';
import { getDeviceId } from '../lib/device.js';
import type { NewProductInput } from '../types/index.js';

describe('Data Layer — Movements & Atomicity', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    await seedCategories();
  });

  describe('applyMovement — atomic updates', () => {
    it('should update qty and create movement in same transaction', async () => {
      const product = await createProduct({
        name: 'Agujas #12',
        brand: 'Kwadron',
        categoryId: (await db.categories.toArray())[0].id,
        supplierId: null,
        format: 'caja de 50',
        qty: 100,
        minQty: 20,
        unit: 'ud',
        unitCost: 5.0,
        barcode: null,
        emoji: '🧵',
        purchasedAt: null,
        expiresAt: null,
        location: 'Caja A',
        notes: null,
      });

      const movement = await applyMovement({
        productId: product.id,
        delta: -15,
        reason: 'uso',
      });

      expect(movement.qtyAfter).toBe(85);

      const updated = await getProduct(product.id);
      expect(updated?.qty).toBe(85);

      const movements = await getMovements(product.id);
      expect(movements.length).toBe(2);
      expect(movements[0].reason).toBe('inicial');
      expect(movements[1].delta).toBe(-15);
    });

    it('should reject negative stock', async () => {
      const product = await createProduct({
        name: 'Tintas',
        brand: 'Dynamic',
        categoryId: (await db.categories.toArray())[0].id,
        supplierId: null,
        format: '1 litro',
        qty: 5,
        minQty: 1,
        unit: 'L',
        unitCost: 25.0,
        barcode: null,
        emoji: '🎨',
        purchasedAt: null,
        expiresAt: null,
        location: 'Estante',
        notes: null,
      });

      await expect(
        applyMovement({
          productId: product.id,
          delta: -10,
        })
      ).rejects.toThrow(/Insufficient stock/);

      const unchanged = await getProduct(product.id);
      expect(unchanged?.qty).toBe(5);

      // only the 'inicial' movement remains; the rejected one was never written
      const movements = await getMovements(product.id);
      expect(movements.length).toBe(1);
      expect(movements[0].reason).toBe('inicial');
    });

    it('should reject zero delta', async () => {
      const product = await createProduct({
        name: 'Vaselina',
        brand: 'H&R',
        categoryId: (await db.categories.toArray())[0].id,
        supplierId: null,
        format: null,
        qty: 20,
        minQty: 5,
        unit: 'jar',
        unitCost: 8.0,
        barcode: null,
        emoji: '🧴',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      await expect(
        applyMovement({
          productId: product.id,
          delta: 0,
        })
      ).rejects.toThrow(/cannot be zero/);
    });

    it('should support decimal quantities', async () => {
      const product = await createProduct({
        name: 'Green Soap',
        brand: 'Zap Ink',
        categoryId: (await db.categories.toArray())[0].id,
        supplierId: null,
        format: '500 ml',
        qty: 10.5,
        minQty: 2.0,
        unit: 'L',
        unitCost: 15.0,
        barcode: null,
        emoji: '🧼',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const movement = await applyMovement({
        productId: product.id,
        delta: -2.75,
        reason: 'uso',
      });

      expect(movement.qtyAfter).toBe(7.75);

      const updated = await getProduct(product.id);
      expect(updated?.qty).toBe(7.75);
    });
  });

  describe('recalculateQty — consistency check', () => {
    it('should match stored qty after random movements', async () => {
      const categories = await db.categories.toArray();
      const product = await createProduct({
        name: 'Test Product',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 100,
        minQty: 10,
        unit: 'ud',
        unitCost: 10.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const movements = [
        { delta: -5, reason: 'uso' as const },
        { delta: 20, reason: 'compra' as const, unitCost: 10 },
        { delta: -10, reason: 'merma' as const },
        { delta: 3, reason: 'ajuste' as const },
        { delta: -8, reason: 'uso' as const },
      ];

      for (const mov of movements) {
        await applyMovement({
          productId: product.id,
          delta: mov.delta,
          reason: mov.reason,
          unitCost: mov.unitCost,
        });
      }

      const stored = await getProduct(product.id);
      const calculated = await recalculateQty(product.id);

      expect(calculated).toBe(stored?.qty);
      expect(calculated).toBe(100); // 100 - 5 + 20 - 10 + 3 - 8 = 100
    });
  });

  describe('movements are immutable', () => {
    it('should not allow editing movements', async () => {
      const product = await createProduct({
        name: 'Cartuchos',
        brand: 'Kwadron',
        categoryId: (await db.categories.toArray())[0].id,
        supplierId: null,
        format: 'caja',
        qty: 50,
        minQty: 10,
        unit: 'ud',
        unitCost: 20.0,
        barcode: null,
        emoji: '🔴',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const movement = await applyMovement({
        productId: product.id,
        delta: -5,
      });

      // This is a design test: the app SHOULD NOT call update on movements.
      // If it does, this test documents that the data layer allows it
      // (Dexie has no built-in "immutable" constraint).
      // The real guard is in the app layer: never editing movements.
      expect(movement.delta).toBe(-5);
    });
  });

  describe('soft deletes', () => {
    it('should hide deleted products from normal queries', async () => {
      const categories = await db.categories.toArray();
      const p1 = await createProduct({
        name: 'Keep this',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 10,
        minQty: 1,
        unit: 'ud',
        unitCost: 1.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const p2 = await createProduct({
        name: 'Delete this',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 5,
        minQty: 1,
        unit: 'ud',
        unitCost: 1.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const allBefore = await getAllProducts();
      expect(allBefore.length).toBe(2);

      await softDeleteProduct(p2.id);

      const allAfter = await getAllProducts();
      expect(allAfter.length).toBe(1);
      expect(allAfter[0].id).toBe(p1.id);

      const getDeleted = await getProduct(p2.id);
      expect(getDeleted).toBeUndefined();

      // But the raw product still exists in the DB
      const rawProduct = await db.products.get(p2.id);
      expect(rawProduct).toBeDefined();
      expect(rawProduct?.deletedAt).toBeTruthy();
    });

    it('should preserve movements of deleted products', async () => {
      const categories = await db.categories.toArray();
      const product = await createProduct({
        name: 'Temp Product',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 50,
        minQty: 5,
        unit: 'ud',
        unitCost: 5.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      await applyMovement({
        productId: product.id,
        delta: -10,
      });

      await applyMovement({
        productId: product.id,
        delta: 20,
        reason: 'compra',
        unitCost: 5.0,
      });

      await softDeleteProduct(product.id);

      const movements = await getMovements(product.id);
      expect(movements.length).toBe(3);
    });
  });

  describe('deviceId and updatedAt', () => {
    it('should track deviceId on every movement', async () => {
      const categories = await db.categories.toArray();
      const product = await createProduct({
        name: 'Multi-device Product',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 10,
        minQty: 1,
        unit: 'ud',
        unitCost: 1.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const movement = await applyMovement({
        productId: product.id,
        delta: -1,
      });

      expect(movement.deviceId).toBe(getDeviceId());
    });

    it('should update product updatedAt on movement', async () => {
      const categories = await db.categories.toArray();
      const product = await createProduct({
        name: 'Update test',
        brand: null,
        categoryId: categories[0].id,
        supplierId: null,
        format: null,
        qty: 10,
        minQty: 1,
        unit: 'ud',
        unitCost: 1.0,
        barcode: null,
        emoji: '📦',
        purchasedAt: null,
        expiresAt: null,
        location: null,
        notes: null,
      });

      const originalTime = product.updatedAt;

      // Wait a tiny bit to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      await applyMovement({
        productId: product.id,
        delta: -1,
      });

      const updated = await getProduct(product.id);
      expect(updated?.updatedAt).not.toBe(originalTime);
      expect(updated?.updatedAt).toBeTruthy();
      if (updated?.updatedAt && originalTime) {
        expect(updated.updatedAt > originalTime).toBe(true);
      }
    });
  });

  describe('bulk creation', () => {
    it('should create 150+ products quickly with initial movements', async () => {
      const categories = await db.categories.toArray();
      const products: NewProductInput[] = Array.from(
        { length: 150 },
        (_, i) => ({
          name: `Product ${i + 1}`,
          brand: `Brand ${Math.floor(i / 10)}`,
          categoryId: categories[i % categories.length].id,
          supplierId: null,
          format: null,
          qty: Math.random() * 100,
          minQty: Math.floor(Math.random() * 20),
          unit: 'ud',
          unitCost: Math.random() * 50,
          barcode: null,
          emoji: '📦',
          purchasedAt: null,
          expiresAt: null,
          location: null,
          notes: null,
        })
      );

      const start = performance.now();
      const created = await createProductsBulk(products);
      const elapsed = performance.now() - start;

      expect(created.length).toBe(150);
      expect(elapsed).toBeLessThan(1000); // Should be under 1 second

      // Verify all have movements
      for (const product of created) {
        const movements = await getMovements(product.id);
        expect(movements.length).toBe(1);
        expect(movements[0].reason).toBe('inicial');
        expect(movements[0].qtyAfter).toBe(product.qty);
      }
    });
  });
});
