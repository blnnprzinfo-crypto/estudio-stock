import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import type { ID, Category } from '../types/index.js';

export async function createCategory(
  input: Omit<Category, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>
): Promise<Category> {
  const timestamp = now();
  const category: Category = {
    id: generateId(),
    ...input,
    createdAt: timestamp,
    updatedAt: timestamp,
    deletedAt: null,
  };

  await db.categories.add(category);
  return category;
}

export async function getCategory(id: ID): Promise<Category | undefined> {
  const category = await db.categories.get(id);
  if (category?.deletedAt) {
    return undefined;
  }
  return category;
}

export async function getAllCategories(): Promise<Category[]> {
  return db.categories
    .filter((c) => !c.deletedAt)
    .sortBy('sortOrder');
}

export async function updateCategory(
  id: ID,
  updates: Partial<Omit<Category, 'id' | 'createdAt' | 'deletedAt'>>
): Promise<Category> {
  const category = await getCategory(id);
  if (!category) {
    throw new Error(`Category not found: ${id}`);
  }

  const timestamp = now();
  await db.categories.update(id, {
    ...updates,
    updatedAt: timestamp,
  });

  const updated = await db.categories.get(id);
  if (!updated) throw new Error('Failed to update category');
  return updated;
}

export async function softDeleteCategory(id: ID): Promise<void> {
  const category = await getCategory(id);
  if (!category) {
    throw new Error(`Category not found: ${id}`);
  }

  await db.categories.update(id, {
    deletedAt: now(),
    updatedAt: now(),
  });
}

export async function restoreCategory(id: ID): Promise<Category> {
  const category = await db.categories.get(id);
  if (!category) {
    throw new Error(`Category not found: ${id}`);
  }

  await db.categories.update(id, {
    deletedAt: null,
    updatedAt: now(),
  });

  const restored = await db.categories.get(id);
  if (!restored) throw new Error('Failed to restore category');
  return restored;
}
