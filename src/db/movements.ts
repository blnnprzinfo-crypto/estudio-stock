import { db } from './db.js';
import { generateId, now } from '../lib/ids.js';
import { getDeviceId } from '../lib/device.js';
import type {
  ID,
  ISODateTime,
  Movement,
  MovementReason,
  Product,
} from '../types/index.js';

export interface ApplyMovementInput {
  productId: ID;
  delta: number;
  reason?: MovementReason;
  unitCost?: number;
  note?: string;
}

/**
 * Reasons that record what the stock cost when it entered.
 *
 * Criterion: a movement carries unitCost when it brings stock IN at a known
 * price. 'compra' is a restock; 'inicial' is the opening balance, which is
 * stock that was also bought at some point. Both are valid cost sources for
 * future valuation. 'uso', 'merma' and 'ajuste' never carry cost: they consume
 * or correct stock that was already paid for, so attaching a price to them
 * would double-count it.
 */
const COST_BEARING_REASONS: readonly MovementReason[] = ['compra', 'inicial'];

/**
 * Build the 'inicial' movement that records a product's opening stock.
 *
 * Returns null when the product opens at zero: applyMovement rejects zero
 * deltas, so the history must not contain them either. Single source of truth
 * for opening movements, used by createProduct and createProductsBulk.
 */
export function buildInitialMovement(
  product: Pick<Product, 'id' | 'qty' | 'unitCost'>,
  deviceId: string,
  timestamp: ISODateTime
): Movement | null {
  if (product.qty === 0) {
    return null;
  }

  return {
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
  };
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
      unitCost: COST_BEARING_REASONS.includes(reason) ? unitCost ?? null : null,
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
 * Recalculate a product's qty from its movement history AND repair the stored
 * value if it has drifted.
 *
 * The movement history is the source of truth: product.qty is a cached total.
 * If the two disagree (corrupted write, interrupted sync, manual tampering),
 * the history wins and the cached value is overwritten inside a transaction.
 *
 * A negative sum is impossible for real stock, so it means the history itself
 * is broken. That throws instead of being clamped to zero: clamping would hide
 * exactly the corruption this function exists to surface.
 */
export async function recalculateQty(productId: ID): Promise<number> {
  return db.transaction('rw', db.products, db.movements, async () => {
    const product = await db.products.get(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    const movements = await db.movements
      .where('productId')
      .equals(productId)
      .toArray();

    const sum = movements.reduce((acc, mov) => acc + mov.delta, 0);

    if (sum < 0) {
      throw new Error(
        `Corrupt movement history for ${product.name}: ${movements.length} movements sum to ${sum}, which cannot be a real stock level. Stored qty left untouched at ${product.qty} for inspection.`
      );
    }

    if (sum !== product.qty) {
      await db.products.update(productId, {
        qty: sum,
        updatedAt: now(),
      });
    }

    return sum;
  });
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
