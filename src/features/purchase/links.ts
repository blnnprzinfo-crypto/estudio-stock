import type { Product, Supplier } from '../../types/index.js';

/** Marcador que se sustituye por el término buscado en searchUrlTemplate. */
export const QUERY_PLACEHOLDER = '{query}';

/**
 * Devuelve la URL solo si es http o https.
 *
 * supplierUrl y searchUrlTemplate los escribe una persona a mano, y un enlace
 * pegado mal puede acabar siendo `javascript:...`. Abrir eso ejecutaría código
 * en la propia aplicación, así que solo pasan los dos esquemas de navegación.
 */
export function safeExternalUrl(raw: string | null): string | null {
  if (!raw) return null;

  const trimmed = raw.trim();
  if (trimmed === '') return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  return parsed.toString();
}

/**
 * Rellena la plantilla de búsqueda de una tienda con el nombre del producto.
 * Devuelve null si la plantilla no sirve o no lleva el marcador.
 */
export function buildSearchUrl(
  template: string | null,
  query: string
): string | null {
  if (!template || !template.includes(QUERY_PLACEHOLDER)) return null;

  const filled = template.replaceAll(
    QUERY_PLACEHOLDER,
    encodeURIComponent(query.trim())
  );

  return safeExternalUrl(filled);
}

export type PurchaseAction =
  | { kind: 'ficha'; url: string; label: string }
  | { kind: 'buscar'; url: string; label: string }
  | { kind: 'sin-enlace'; label: string; reason: string };

/**
 * Decide qué puede hacer el botón de una línea de la lista de compra.
 *
 * Primero la ficha exacta, que es la única sin ambigüedad. Si no la hay, la
 * búsqueda de la tienda, que ahorra teclear sin fingir precisión. Si no hay
 * ninguna de las dos, el botón queda desactivado: es preferible a mandarla a
 * un sitio que no es.
 */
export function resolvePurchaseAction(
  product: Product,
  supplier: Supplier | null
): PurchaseAction {
  const direct = safeExternalUrl(product.supplierUrl);
  if (direct) {
    return { kind: 'ficha', url: direct, label: 'Abrir ficha' };
  }

  const search = buildSearchUrl(supplier?.searchUrlTemplate ?? null, product.name);
  if (search) {
    return { kind: 'buscar', url: search, label: 'Buscar en la tienda' };
  }

  return {
    kind: 'sin-enlace',
    label: 'Sin enlace',
    reason: supplier
      ? 'Falta el enlace del producto y su proveedor no tiene búsqueda configurada'
      : 'Falta el enlace del producto y no tiene proveedor asignado',
  };
}

/** Cuánto falta para volver al mínimo. Nunca negativo. */
export function missingToMinimum(product: Product): number {
  return Math.max(0, product.minQty - product.qty);
}
