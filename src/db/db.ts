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

    // Versión 2: enlaces de compra. Ningún índice nuevo, así que los almacenes
    // no cambian; el upgrade solo rellena los registros que ya existían para
    // que el campo esté siempre presente y no haya que distinguir entre "sin
    // enlace" y "campo que no existe".
    this.version(2)
      .stores({
        products:
          '&id, name, categoryId, supplierId, barcode, deletedAt, updatedAt',
        movements: '&id, productId, createdAt, reason',
        categories: '&id, name, sortOrder, deletedAt',
        suppliers: '&id, name, deletedAt',
      })
      .upgrade(async (transaction) => {
        await transaction
          .table<Product>('products')
          .toCollection()
          .modify((product) => {
            if (product.supplierUrl === undefined) product.supplierUrl = null;
          });

        await transaction
          .table<Supplier>('suppliers')
          .toCollection()
          .modify((supplier) => {
            if (supplier.searchUrlTemplate === undefined) {
              supplier.searchUrlTemplate = null;
            }
          });
      });
  }
}

export const db = new EstudioStockDB();
