import Dexie, { type Table } from 'dexie';
import type {
  Product,
  Movement,
  Category,
  Supplier,
} from '../types/index.js';

export class EstudioStockDB extends Dexie {
  products!: Table<Product>;
  movements!: Table<Movement>;
  categories!: Table<Category>;
  suppliers!: Table<Supplier>;

  constructor() {
    super('EstudioStock');
    this.version(1).stores({
      products:
        '&id, name, categoryId, supplierId, barcode, deletedAt, updatedAt',
      movements: '&id, productId, createdAt, reason',
      categories: '&id, name, sortOrder, deletedAt',
      suppliers: '&id, name, deletedAt',
    });
  }
}

export const db = new EstudioStockDB();
