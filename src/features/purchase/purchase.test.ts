import { describe, it, expect } from 'vitest';
import {
  buildSearchUrl,
  missingToMinimum,
  resolvePurchaseAction,
  safeExternalUrl,
} from './links.js';
import { formatShoppingList, groupForPurchase, SIN_PROVEEDOR } from './shoppingList.js';
import type { Product, Supplier } from '../../types/index.js';

const ATOMX_TEMPLATE =
  'https://www.atomxsupply.com/en/search?controller=search&s={query}';

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 's1',
    name: 'AtomX Supply',
    website: 'https://www.atomxsupply.com',
    searchUrlTemplate: ATOMX_TEMPLATE,
    notes: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'Cartuchos 1203RL',
    brand: 'Kwadron',
    categoryId: 'c1',
    supplierId: 's1',
    format: 'caja de 20',
    qty: 2,
    minQty: 5,
    unit: 'ud',
    unitCost: 12,
    barcode: null,
    emoji: '🔴',
    purchasedAt: null,
    expiresAt: null,
    location: null,
    notes: null,
    supplierUrl: null,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    deletedAt: null,
    deviceId: 'd1',
    ...overrides,
  };
}

describe('safeExternalUrl', () => {
  it('acepta http y https', () => {
    expect(safeExternalUrl('https://www.atomxsupply.com/p/123')).toBe(
      'https://www.atomxsupply.com/p/123'
    );
    expect(safeExternalUrl('http://tienda.local/p/1')).toBe('http://tienda.local/p/1');
  });

  it('rechaza esquemas que ejecutarian codigo o abririan ficheros', () => {
    // Un enlace pegado mal no puede acabar ejecutandose dentro de la app
    expect(safeExternalUrl('javascript:alert(document.cookie)')).toBeNull();
    expect(safeExternalUrl('  JavaScript:alert(1)  ')).toBeNull();
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(safeExternalUrl('file:///C:/Windows/System32')).toBeNull();
  });

  it('rechaza vacios y texto que no es una URL', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl('atomx punto com')).toBeNull();
  });
});

describe('buildSearchUrl', () => {
  it('mete el nombre codificado en la plantilla de AtomX', () => {
    const url = buildSearchUrl(ATOMX_TEMPLATE, 'Cartuchos 1203RL');
    expect(url).toBe(
      'https://www.atomxsupply.com/en/search?controller=search&s=Cartuchos%201203RL'
    );
  });

  it('escapa caracteres que romperian la query', () => {
    const url = buildSearchUrl(ATOMX_TEMPLATE, 'tinta negra & gris #1');
    expect(url).toContain('%26');
    expect(url).toContain('%231');
  });

  it('devuelve null si no hay plantilla o le falta el marcador', () => {
    expect(buildSearchUrl(null, 'agujas')).toBeNull();
    expect(buildSearchUrl('https://tienda.com/buscar', 'agujas')).toBeNull();
  });
});

describe('resolvePurchaseAction', () => {
  it('prefiere la ficha exacta cuando existe', () => {
    const action = resolvePurchaseAction(
      product({ supplierUrl: 'https://www.atomxsupply.com/p/999' }),
      supplier()
    );
    expect(action.kind).toBe('ficha');
    expect(action).toHaveProperty('url', 'https://www.atomxsupply.com/p/999');
  });

  it('cae en la busqueda cuando no hay ficha', () => {
    const action = resolvePurchaseAction(product(), supplier());
    expect(action.kind).toBe('buscar');
  });

  it('cae en la busqueda si la ficha guardada no es un enlace valido', () => {
    const action = resolvePurchaseAction(
      product({ supplierUrl: 'javascript:alert(1)' }),
      supplier()
    );
    expect(action.kind).toBe('buscar');
  });

  it('se desactiva sin ficha y sin plantilla', () => {
    const action = resolvePurchaseAction(
      product(),
      supplier({ searchUrlTemplate: null })
    );
    expect(action.kind).toBe('sin-enlace');
  });

  it('se desactiva sin proveedor asignado', () => {
    const action = resolvePurchaseAction(product({ supplierId: null }), null);
    expect(action.kind).toBe('sin-enlace');
  });
});

describe('missingToMinimum', () => {
  it('calcula lo que falta para volver al minimo', () => {
    expect(missingToMinimum(product({ qty: 2, minQty: 5 }))).toBe(3);
  });

  it('en el minimo exacto no falta nada, pero sigue contando como reposicion', () => {
    expect(missingToMinimum(product({ qty: 5, minQty: 5 }))).toBe(0);
  });

  it('nunca es negativo', () => {
    expect(missingToMinimum(product({ qty: 20, minQty: 5 }))).toBe(0);
  });
});

describe('groupForPurchase', () => {
  it('agrupa por proveedor y deja los sueltos al final', () => {
    const atomx = supplier();
    const otra = supplier({ id: 's2', name: 'Barber Depot' });
    const groups = groupForPurchase(
      [
        product({ id: 'p1', name: 'Zeta', supplierId: 's1' }),
        product({ id: 'p2', name: 'Alfa', supplierId: 's1' }),
        product({ id: 'p3', name: 'Guantes', supplierId: 's2' }),
        product({ id: 'p4', name: 'Suelto', supplierId: null }),
      ],
      [atomx, otra]
    );

    expect(groups.map((g) => g.title)).toEqual([
      'AtomX Supply',
      'Barber Depot',
      SIN_PROVEEDOR,
    ]);
    // Dentro de cada grupo, por nombre
    expect(groups[0].products.map((p) => p.name)).toEqual(['Alfa', 'Zeta']);
  });

  it('trata como sin proveedor los que apuntan a uno borrado', () => {
    const groups = groupForPurchase(
      [product({ supplierId: 'fantasma' })],
      [supplier()]
    );
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe(SIN_PROVEEDOR);
  });
});

describe('formatShoppingList', () => {
  it('escribe texto plano agrupado, legible en un mensaje', () => {
    const groups = groupForPurchase(
      [
        product({ id: 'p1', name: 'Cartuchos 1203RL', qty: 2, minQty: 5 }),
        product({ id: 'p2', name: 'Tinta negra', brand: 'Dynamic', format: '1 L', qty: 0, minQty: 2, supplierId: null }),
      ],
      [supplier()]
    );

    const text = formatShoppingList(groups);
    expect(text).toBe(
      [
        'AtomX Supply:',
        '- Cartuchos 1203RL (Kwadron caja de 20): 3 ud',
        '',
        'Sin proveedor:',
        '- Tinta negra (Dynamic 1 L): 2 ud',
      ].join('\n')
    );
  });

  it('no deja el mensaje vacio cuando no hay nada', () => {
    expect(formatShoppingList([])).toBe('No hay nada que reponer.');
  });
});
