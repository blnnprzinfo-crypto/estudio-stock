import { beforeEach, describe, it, expect } from 'vitest';
import { db } from './db.js';
import { seedCategories } from './seed.js';
import { getAllCategories } from './categories.js';

describe('seedCategories', () => {
  beforeEach(async () => {
    await db.categories.clear();
  });

  it('crea las categorías iniciales una sola vez', async () => {
    await seedCategories();
    const first = await getAllCategories();

    await seedCategories();
    const second = await getAllCategories();

    expect(second.length).toBe(first.length);
  });

  it('no duplica cuando se llama dos veces a la vez', async () => {
    // Lo que hace StrictMode en desarrollo: dos efectos sin esperar al primero.
    await Promise.all([seedCategories(), seedCategories()]);

    const categories = await getAllCategories();
    const names = categories.map((category) => category.name);

    expect(new Set(names).size).toBe(names.length);
  });
});
