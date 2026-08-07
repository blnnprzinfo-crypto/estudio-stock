import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import { getDeviceId } from '../lib/device.js';
import type { ID, Movement, MovementReason } from '../types/index.js';

export interface ApplyMovementInput {
  productId: ID;
  delta: number;
  reason?: MovementReason;
  unitCost?: number;
  note?: string;
}

/**
 * Apply a movement to a product. This is the ONLY function that should update
 * product.qty. It ensures atomicity: either both the product qty and the movement
 * are written, or neither.
 */
export async function applyMovement(
  input: ApplyMovementInput
): Promise<Movement> {
  const { productId, delta, reason = 'uso', unitCost, note } = input;

  if (delta === 0) {
    throw new Error('Movement delta cannot be zero');
  }

  return db.transaction('rw', db.products, db.movements, async () => {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const newQty = product.qty + delta;
    if (newQty < 0) {
      throw new Error(
        `Insufficient stock: ${product.name} has ${product.qty}, cannot reduce by ${Math.abs(delta)}`
      );
    }

    const timestamp = now();
    const deviceId = getDeviceId();

    const movement: Movement = {
      id: generateId(),
      productId,
      delta,
      reason,
      qtyAfter: newQty,
      unitCost: reason === 'compra' ? unitCost ?? null : null,
      note: note ?? null,
      createdAt: timestamp,
      userId: null,
      deviceId,
    };

    await db.movements.add(movement);
    await db.products.update(productId, {
      qty: newQty,
      updatedAt: timestamp,
    });

    return movement;
  });
}

/**
 * Recalculate product qty by summing all movements.
 * This is a safety net in case the stored qty ever diverges from the movement history.
 */
export async function recalculateQty(productId: ID): Promise<number> {
  const movements = await db.movements
    .where('productId')
    .equals(productId)
    .toArray();

  const sum = movements.reduce((acc, mov) => acc + mov.delta, 0);
  return Math.max(0, sum);
}

/**
 * Get all movements for a product, ordered by creation date.
 */
export async function getMovements(productId: ID): Promise<Movement[]> {
  return db.movements
    .where('productId')
    .equals(productId)
    .sortBy('createdAt');
}

/**
 * Get movement count for a product.
 */
export async function getMovementCount(productId: ID): Promise<number> {
  return db.movements.where('productId').equals(productId).count();
}

/**
 * Get paginated movements for a product.
 */
export async function getMovementsPaginated(
  productId: ID,
  offset: number = 0,
  limit: number = 50
): Promise<Movement[]> {
  return db.movements
    .where('productId')
    .equals(productId)
    .reverse()
    .offset(offset)
    .limit(limit)
    .toArray();
}

/**
 * Get all movements with a specific reason.
 */
export async function getMovementsByReason(
  reason: MovementReason
): Promise<Movement[]> {
  return db.movements.where('reason').equals(reason).toArray();
}
