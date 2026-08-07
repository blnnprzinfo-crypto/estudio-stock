export type ID = string; // uuid v4
export type ISODate = string; // "2026-08-06"
export type ISODateTime = string; // "2026-08-06T12:30:00.000Z"

export interface Product {
  id: ID;
  name: string;
  brand: string | null;
  categoryId: ID;
  supplierId: ID | null;
  format: string | null;
  qty: number;
  minQty: number;
  unit: string;
  unitCost: number;
  barcode: string | null;
  emoji: string;
  purchasedAt: ISODate | null;
  expiresAt: ISODate | null;
  location: string | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
  deviceId: string;
}

export type NewProduct = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deviceId'
>;

export type MovementReason = 'uso' | 'compra' | 'ajuste' | 'merma' | 'inicial';

export interface Movement {
  id: ID;
  productId: ID;
  delta: number;
  reason: MovementReason;
  qtyAfter: number;
  unitCost: number | null;
  note: string | null;
  createdAt: ISODateTime;
  userId: ID | null;
  deviceId: string;
}

export interface Category {
  id: ID;
  name: string;
  emoji: string;
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

export interface Supplier {
  id: ID;
  name: string;
  website: string | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}
