import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import type { Category } from '../types/index.js';

const INITIAL_CATEGORIES = [
  { name: 'Agujas', emoji: '🧵' },
  { name: 'Cartuchos', emoji: '🔴' },
  { name: 'Tintas', emoji: '🎨' },
  { name: 'Guantes', emoji: '🧤' },
  { name: 'Film', emoji: '📽️' },
  { name: 'Stencil', emoji: '📄' },
  { name: 'Green Soap', emoji: '🧼' },
  { name: 'Vaselina', emoji: '🧴' },
  { name: 'Papel', emoji: '📋' },
  { name: 'Productos de limpieza', emoji: '🧹' },
  { name: 'Material desechable', emoji: '🗑️' },
  { name: 'Mobiliario', emoji: '🪑' },
  { name: 'Electrónica', emoji: '⚡' },
  { name: 'Accesorios', emoji: '🔧' },
  { name: 'Otros', emoji: '📦' },
];

/**
 * Crea las categorías iniciales la primera vez, y solo la primera vez.
 *
 * Contar y escribir van en la misma transacción a propósito. Sueltas, dos
 * llamadas a la vez leen ambas cero y ambas insertan, y el inventario acaba con
 * las quince categorías duplicadas. Pasa de verdad: en desarrollo, StrictMode
 * ejecuta los efectos dos veces. IndexedDB serializa las transacciones de
 * escritura sobre la misma tabla, así que la segunda ya ve las quince y sale.
 */
export async function seedCategories(): Promise<void> {
  await db.transaction('rw', db.categories, async () => {
    const existingCount = await db.categories.count();
    if (existingCount > 0) return;

    const timestamp = now();
    const categories: Category[] = INITIAL_CATEGORIES.map((cat, i) => ({
      id: generateId(),
      name: cat.name,
      emoji: cat.emoji,
      sortOrder: i,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    }));

    await db.categories.bulkAdd(categories);
  });
}
