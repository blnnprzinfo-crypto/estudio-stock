import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import { getDeviceId } from '../lib/device.js';
import type { ID, Product, NewProduct } from '../types/index.js';

/**
 * Create a single product.
 */
export async function createProduct(
  input: Omit<NewProduct, 'deviceId'>
): Promise<Product> {
  return db.transaction('rw', db.products, db.movements, async () => {
    const timestamp = now();
    const deviceId = getDeviceId();
    const product: Product = {
      id: generateId(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      deviceId,
    };

    await db.products.add(product);
    await db.movements.add({
      id: generateId(),
      productId: product.id,
      delta: product.qty,
      reason: 'inicial',
      qtyAfter: product.qty,
      unitCost: product.unitCost,
      note: null,
      createdAt: timestamp,
      userId: null,
      deviceId,
    });

    return product;
  });
}

/**
 * Create multiple products in a single transaction, each with an 'inicial' movement.
 */
export async function createProductsBulk(
  products: Omit<NewProduct, 'deviceId'>[]
): Promise<Product[]> {
  return db.transaction('rw', db.products, db.movements, async () => {
    const timestamp = now();
    const deviceId = getDeviceId();

    const dbProducts: Product[] = products.map((input) => ({
      id: generateId(),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
      deviceId,
    }));

    await db.products.bulkAdd(dbProducts);

    const movements = dbProducts.map((product) => ({
      id: generateId(),
      productId: product.id,
      delta: product.qty,
      reason: 'inicial' as const,
      qtyAfter: product.qty,
      unitCost: product.unitCost,
      note: null,
      createdAt: timestamp,
      userId: null,
      deviceId,
    }));

    await db.movements.bulkAdd(movements);

    return dbProducts;
  });
}

/**
 * Get a product by ID. Returns null if not found or deleted.
 */
export async function getProduct(id: ID): Promise<Product | undefined> {
  const product = await db.products.get(id);
  if (product?.deletedAt) {
    return undefined;
  }
  return product;
}

/**
 * Get all non-deleted products.
 */
export async function getAllProducts(): Promise<Product[]> {
  return db.products.filter((p) => !p.deletedAt).toArray();
}

/**
 * Search products by name (case-insensitive, substring match).
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const allProducts = await getAllProducts();
  const lower = query.toLowerCase();
  return allProducts.filter((p) => p.name.toLowerCase().includes(lower));
}

/**
 * Get products by category.
 */
export async function getProductsByCategory(
  categoryId: ID
): Promise<Product[]> {
  return db.products
    .where('categoryId')
    .equals(categoryId)
    .and((p) => !p.deletedAt)
    .toArray();
}

/**
 * Get products by supplier.
 */
export async function getProductsBySupplier(
  supplierId: ID | null
): Promise<Product[]> {
  if (!supplierId) {
    return db.products
      .filter((p: Product) => p.supplierId === null && !p.deletedAt)
      .toArray();
  }
  return db.products
    .where('supplierId')
    .equals(supplierId)
    .filter((p: Product) => !p.deletedAt)
    .toArray();
}

/**
 * Get products by barcode.
 */
export async function getProductByBarcode(
  barcode: string
): Promise<Product | undefined> {
  const result = await db.products
    .where('barcode')
    .equals(barcode)
    .first();
  if (result?.deletedAt) {
    return undefined;
  }
  return result;
}

/**
 * Update a product. Does NOT update qty directly (use applyMovement for that).
 */
export async function updateProduct(
  id: ID,
  updates: Partial<Omit<Product, 'id' | 'createdAt' | 'deletedAt' | 'deviceId'>>
): Promise<Product> {
  const product = await getProduct(id);
  if (!product) {
    throw new Error(`Product not found: ${id}`);
  }

  const timestamp = now();
  await db.products.update(id, {
    ...updates,
    updatedAt: timestamp,
  });

  const updated = await db.products.get(id);
  if (!updated) throw new Error('Failed to update product');
  return updated;
}

/**
 * Soft-delete a product. Preserves all movement history.
 */
export async function softDeleteProduct(id: ID): Promise<void> {
  const product = await getProduct(id);
  if (!product) {
    throw new Error(`Product not found: ${id}`);
  }

  await db.products.update(id, {
    deletedAt: now(),
    updatedAt: now(),
  });
}

/**
 * Restore a soft-deleted product.
 */
export async function restoreProduct(id: ID): Promise<Product> {
  const product = await db.products.get(id);
  if (!product) {
    throw new Error(`Product not found: ${id}`);
  }

  const updated = { deletedAt: null, updatedAt: now() };
  await db.products.update(id, updated);

  const restored = await db.products.get(id);
  if (!restored) throw new Error('Failed to restore product');
  return restored;
}

/**
 * Duplicate a product with a new name.
 */
export async function duplicateProduct(
  id: ID,
  newName: string
): Promise<Product> {
  const original = await getProduct(id);
  if (!original) {
    throw new Error(`Product not found: ${id}`);
  }

  const newProduct = await createProduct({
    name: newName,
    brand: original.brand,
    categoryId: original.categoryId,
    supplierId: original.supplierId,
    format: original.format,
    qty: 0,
    minQty: original.minQty,
    unit: original.unit,
    unitCost: original.unitCost,
    barcode: original.barcode,
    emoji: original.emoji,
    purchasedAt: original.purchasedAt,
    expiresAt: original.expiresAt,
    location: original.location,
    notes: original.notes,
  });

  return newProduct;
}

/**
 * Get products below minimum stock.
 */
export async function getLowStockProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  return all.filter((p) => p.qty < p.minQty);
}

/**
 * Get expired products.
 */
export async function getExpiredProducts(): Promise<Product[]> {
  const all = await getAllProducts();
  const today = new Date().toISOString().split('T')[0];
  return all.filter((p) => p.expiresAt && p.expiresAt <= today);
}
