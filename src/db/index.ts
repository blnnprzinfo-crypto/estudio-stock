export { db } from './db.js';
export { seedCategories } from './seed.js';

// Movements
export { applyMovement, recalculateQty, getMovements, getMovementCount, getMovementsPaginated, getMovementsByReason } from './movements.js';
export type { ApplyMovementInput } from './movements.js';

// Products
export {
  createProduct,
  createProductsBulk,
  getProduct,
  getAllProducts,
  searchProducts,
  getProductsByCategory,
  getProductsBySupplier,
  getProductByBarcode,
  updateProduct,
  softDeleteProduct,
  restoreProduct,
  duplicateProduct,
  getLowStockProducts,
  getExpiredProducts,
} from './products.js';

// Categories
export {
  createCategory,
  getCategory,
  getAllCategories,
  updateCategory,
  softDeleteCategory,
  restoreCategory,
} from './categories.js';

// Suppliers
export {
  createSupplier,
  getSupplier,
  getAllSuppliers,
  updateSupplier,
  softDeleteSupplier,
  restoreSupplier,
} from './suppliers.js';
