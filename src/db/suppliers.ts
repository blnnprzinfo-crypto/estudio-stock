import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import type { ID, Supplier } from '../types/index.js';

export async function createSupplier(
  input: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<Supplier> {
  const timestamp = now();
  const supplier: Supplier = {
    id: generateId(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  await db.suppliers.add(supplier);
  return supplier;
}

export async function getSupplier(id: ID): Promise<Supplier | undefined> {
  const supplier = await db.suppliers.get(id);
  if (supplier?.deletedAt) {
    return undefined;
  }
  return supplier;
}

export async function getAllSuppliers(): Promise<Supplier[]> {
  return db.suppliers
    .filter((s) => !s.deletedAt)
    .sortBy('name');
}

export async function updateSupplier(
  id: ID,
  updates: Partial<Omit<Supplier, 'id' | 'createdAt' | 'deletedAt'>>
): Promise<Supplier> {
  const supplier = await getSupplier(id);
  if (!supplier) {
    throw new Error(`Supplier not found: ${id}`);
  }

  const timestamp = now();
  await db.suppliers.update(id, {
    ...updates,
    updatedAt: timestamp,
  });

  const updated = await db.suppliers.get(id);
  if (!updated) throw new Error('Failed to update supplier');
  return updated;
}

export async function softDeleteSupplier(id: ID): Promise<void> {
  const supplier = await getSupplier(id);
  if (!supplier) {
    throw new Error(`Supplier not found: ${id}`);
  }

  await db.suppliers.update(id, {
    deletedAt: now(),
    updatedAt: now(),
  });
}

export async function restoreSupplier(id: ID): Promise<Supplier> {
  const supplier = await db.suppliers.get(id);
  if (!supplier) {
    throw new Error(`Supplier not found: ${id}`);
  }

  await db.suppliers.update(id, {
    deletedAt: null,
    updatedAt: now(),
  });

  const restored = await db.suppliers.get(id);
  if (!restored) throw new Error('Failed to restore supplier');
  return restored;
}
