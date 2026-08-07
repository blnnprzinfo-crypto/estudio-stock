import { defaultOrderQty } from './links.js';
import type { ID, Product, Supplier } from '../../types/index.js';

export interface PurchaseGroup {
  supplier: Supplier | null;
  title: string;
  products: Product[];
}

/** Etiqueta del grupo de los que no tienen proveedor asignado. */
export const SIN_PROVEEDOR = 'Sin proveedor';

/**
 * Agrupa por proveedor los productos que hay que reponer.
 *
 * Misma condición que getLowStockProducts: estar EN el mínimo ya cuenta, no
 * solo por debajo. El grupo sin proveedor va siempre el último, porque es el
 * que necesita configurarse antes de servir para algo.
 */
export function groupForPurchase(
  lowStock: Product[],
  suppliers: Supplier[]
): PurchaseGroup[] {
  const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const groups = new Map<string, PurchaseGroup>();

  for (const product of lowStock) {
    const supplier = product.supplierId ? byId.get(product.supplierId) ?? null : null;
    const key = supplier?.id ?? SIN_PROVEEDOR;

    let group = groups.get(key);
    if (!group) {
      group = {
        supplier,
        title: supplier?.name ?? SIN_PROVEEDOR,
        products: [],
      };
      groups.set(key, group);
    }
    group.products.push(product);
  }

  for (const group of groups.values()) {
    group.products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  return [...groups.values()].sort((a, b) => {
    if (a.supplier === null) return 1;
    if (b.supplier === null) return -1;
    return a.title.localeCompare(b.title, 'es');
  });
}

/**
 * Texto plano de la lista, para pegar en un mensaje al proveedor.
 * Sin markdown ni adornos: se lee igual en WhatsApp que en un correo.
 *
 * quantities lleva las unidades ajustadas a mano con el selector. Lo que no
 * esté ahí sale con la cantidad propuesta por defecto.
 */
export function formatShoppingList(
  groups: PurchaseGroup[],
  quantities: Map<ID, number> = new Map()
): string {
  if (groups.length === 0) {
    return 'No hay nada que reponer.';
  }

  return groups
    .map((group) => {
      const lines = group.products.map((product) => {
        const amount = quantities.get(product.id) ?? defaultOrderQty(product);
        const detail = [product.brand, product.format].filter(Boolean).join(' ');
        const name = detail ? `${product.name} (${detail})` : product.name;
        return `- ${name}: ${formatNumber(amount)} ${product.unit}`;
      });

      return [`${group.title}:`, ...lines].join('\n');
    })
    .join('\n\n');
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
