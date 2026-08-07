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
  /**
   * Enlace a la ficha de este producto en la web del proveedor.
   *
   * Lo pega la usuaria a mano la primera vez que compra el producto. No se
   * deduce ni se busca automáticamente: emparejar nombres contra un catálogo
   * ajeno acaba pidiendo el producto equivocado.
   */
  supplierUrl: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
  deviceId: string;
}

export type NewProduct = Omit<
  Product,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'deviceId'
>;

/**
 * Lo que hace falta para dar de alta un producto.
 *
 * supplierUrl va aparte y es opcional porque se pega después, una vez, desde el
 * detalle: obligar a escribir `supplierUrl: null` en cada alta solo añadiría
 * ruido. Guardado, el campo siempre existe; es null mientras no haya enlace.
 */
export type NewProductInput = Omit<NewProduct, 'supplierUrl'> & {
  supplierUrl?: string | null;
};

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
  /**
   * Plantilla de búsqueda de la tienda, con {query} donde va el término.
   * Ejemplo de AtomX:
   * https://www.atomxsupply.com/en/search?controller=search&s={query}
   *
   * Sirve de respaldo cuando un producto todavía no tiene supplierUrl: abre la
   * búsqueda con el nombre escrito, sin prometer que el resultado sea el
   * producto correcto.
   */
  searchUrlTemplate: string | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}
