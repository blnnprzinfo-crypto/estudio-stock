import { useCallback, useMemo, useState } from 'react';
import { useProducts } from './features/inventory/useProducts.js';
import { InventoryList } from './features/inventory/InventoryList.js';
import { ProductDetail } from './features/inventory/ProductDetail.js';
import { ProductForm } from './features/inventory/ProductForm.js';
import { BulkEntry } from './features/inventory/BulkEntry.js';
import { PurchaseList } from './features/purchase/PurchaseList.js';
import { EmptyState } from './components/EmptyState.js';
import type { ID } from './types/index.js';

type Tab = 'inventario' | 'compra' | 'nuevo' | 'rapida';

const TABS: { key: Tab; label: string }[] = [
  { key: 'inventario', label: 'Inventario' },
  { key: 'compra', label: 'Compra' },
  { key: 'nuevo', label: 'Nuevo' },
  { key: 'rapida', label: 'Alta rápida' },
];

const TITLES: Record<Tab, string> = {
  inventario: 'Inventario',
  compra: 'Compra',
  nuevo: 'Nuevo producto',
  rapida: 'Alta rápida',
};

/**
 * Armazón de la aplicación. Cuatro pantallas se manejan con estado: una
 * librería de rutas no aportaría nada y sí una dependencia más.
 */
export default function App() {
  const { products, categories, suppliers, categoryNames, loading, error, reload } =
    useProducts();
  const [tab, setTab] = useState<Tab>('inventario');
  const [selectedId, setSelectedId] = useState<ID | null>(null);

  const selected = useMemo(
    () => products.find((product) => product.id === selectedId) ?? null,
    [products, selectedId]
  );

  const openDetail = useCallback((id: ID) => setSelectedId(id), []);

  const closeDetail = useCallback(async () => {
    await reload();
    setSelectedId(null);
  }, [reload]);

  const afterCreate = useCallback(async () => {
    await reload();
    setTab('inventario');
  }, [reload]);

  const afterBulk = useCallback(async () => {
    await reload();
  }, [reload]);

  const showingDetail = selected !== null;

  // h-dvh, no min-h-dvh: con 150 productos la columna crecía hasta diez mil
  // píxeles y se llevaba de pantalla el buscador y las pestañas. Con altura
  // fija, quien se desplaza es la lista dentro de su propia caja.
  return (
    <div className="mx-auto flex h-dvh w-full max-w-[460px] flex-col overflow-hidden bg-white shadow-[0_0_0_1px_rgba(0,0,0,.04)]">
      <header className="grid grid-cols-[56px_1fr_56px] items-center px-4 pt-[max(12px,env(safe-area-inset-top))]">
        {showingDetail ? (
          <button
            type="button"
            onClick={() => void closeDetail()}
            aria-label="Volver al inventario"
            className="grid h-[46px] w-[46px] place-items-center text-[22px]"
          >
            ←
          </button>
        ) : (
          <span />
        )}
        <h1 className="text-center text-[24px] font-black leading-none">
          {showingDetail ? 'Producto' : TITLES[tab]}
        </h1>
        <span />
      </header>

      {!showingDetail ? (
        <nav className="grid grid-cols-4 px-4 pt-3" aria-label="Secciones">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-current={tab === key ? 'page' : undefined}
              className={`min-h-[44px] border-b-2 px-1 text-[14px] font-bold ${
                tab === key
                  ? 'border-teal text-teal'
                  : 'border-transparent text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      ) : null}

      <main className="mt-3 flex min-h-0 flex-1 flex-col">
        {loading ? (
          <EmptyState emoji="⏳" title="Cargando" message="Abriendo el inventario." />
        ) : error ? (
          <EmptyState emoji="⚠️" title="No se pudo abrir" message={error} />
        ) : showingDetail ? (
          <ProductDetail
            key={selected.id}
            product={selected}
            categories={categories}
            suppliers={suppliers}
            onDone={() => void closeDetail()}
          />
        ) : tab === 'inventario' ? (
          <InventoryList
            products={products}
            categories={categories}
            categoryNames={categoryNames}
            onSelect={openDetail}
            onReload={reload}
          />
        ) : tab === 'compra' ? (
          <PurchaseList
            products={products}
            suppliers={suppliers}
            onSelect={openDetail}
          />
        ) : tab === 'nuevo' ? (
          <ProductForm
            categories={categories}
            suppliers={suppliers}
            onDone={() => void afterCreate()}
          />
        ) : (
          <BulkEntry categories={categories} onDone={() => void afterBulk()} />
        )}
      </main>
    </div>
  );
}
