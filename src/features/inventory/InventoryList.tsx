import { useCallback, useDeferredValue, useMemo, useState } from 'react';
import { ProductRow } from './ProductRow.js';
import { EmptyState } from '../../components/EmptyState.js';
import type { Category, ID, Product } from '../../types/index.js';

type SortKey = 'nombre' | 'cantidad' | 'categoria' | 'reciente';

const SORT_LABELS: Record<SortKey, string> = {
  nombre: 'Nombre',
  cantidad: 'Cantidad',
  categoria: 'Categoría',
  reciente: 'Más reciente',
};

const SORT_KEYS = Object.keys(SORT_LABELS) as SortKey[];

interface InventoryListProps {
  products: Product[];
  categories: Category[];
  categoryNames: Map<ID, string>;
  onSelect: (id: ID) => void;
}

export function InventoryList({
  products,
  categories,
  categoryNames,
  onSelect,
}: InventoryListProps) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<ID | 'todas'>('todas');
  const [sort, setSort] = useState<SortKey>('nombre');

  // El input sigue el estado inmediato (se escribe sin retraso) mientras que la
  // lista se recalcula con el valor diferido: React puede abandonar el filtrado
  // a medias si llega otra pulsación, en vez de encadenar 150 filas por tecla.
  const deferredQuery = useDeferredValue(query);

  const visible = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase();

    const filtered = products.filter((product) => {
      if (categoryId !== 'todas' && product.categoryId !== categoryId) {
        return false;
      }
      if (!needle) return true;

      const haystack = [
        product.name,
        product.brand ?? '',
        product.format ?? '',
        categoryNames.get(product.categoryId) ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(needle);
    });

    return sortProducts(filtered, sort, categoryNames);
  }, [products, deferredQuery, categoryId, sort, categoryNames]);

  // Estable entre pulsaciones para que memo de ProductRow no se desactive.
  const handleSelect = useCallback((id: ID) => onSelect(id), [onSelect]);

  // Las opciones solo dependen de las categorías. El desplegable no se
  // reconstruye al escribir en el buscador, que era el fallo del prototipo.
  const categoryOptions = useMemo(
    () =>
      categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.emoji} {category.name}
        </option>
      )),
    [categories]
  );

  const lowCount = useMemo(
    () => visible.filter((product) => product.qty <= product.minQty).length,
    [visible]
  );

  const isFiltering = query.trim() !== '' || categoryId !== 'todas';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="grid gap-2 border-b border-line px-4 pb-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar producto"
          aria-label="Buscar producto"
          className="min-h-[48px] w-full rounded-lg border border-line bg-white px-3 text-[15px] outline-none focus:border-teal"
        />

        <div className="grid grid-cols-2 gap-2">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            aria-label="Filtrar por categoría"
            className="min-h-[44px] w-full rounded-lg border border-line bg-white px-2 text-[14px] outline-none focus:border-teal"
          >
            <option value="todas">Todas las categorías</option>
            {categoryOptions}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortKey)}
            aria-label="Ordenar por"
            className="min-h-[44px] w-full rounded-lg border border-line bg-white px-2 text-[14px] outline-none focus:border-teal"
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {visible.length === 0 ? (
          isFiltering ? (
            <EmptyState
              emoji="🔍"
              title="Sin resultados"
              message="Prueba con otra palabra o quita el filtro de categoría."
            />
          ) : (
            <EmptyState
              emoji="📦"
              title="Todavía no hay productos"
              message="Usa el alta rápida para meter la carga inicial desde el ordenador."
            />
          )
        ) : (
          visible.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              categoryName={categoryNames.get(product.categoryId) ?? 'Sin categoría'}
              onSelect={handleSelect}
            />
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-line bg-soft px-4 py-3 text-[13px] font-semibold text-muted">
        <span>
          {visible.length}{' '}
          {visible.length === 1 ? 'producto' : 'productos'}
        </span>
        {lowCount > 0 ? (
          <span className="text-danger">{lowCount} en mínimo o por debajo</span>
        ) : null}
      </div>
    </div>
  );
}

function sortProducts(
  products: Product[],
  sort: SortKey,
  categoryNames: Map<ID, string>
): Product[] {
  const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'es');

  // Copia antes de ordenar: el array llega del estado y no debe mutarse.
  switch (sort) {
    case 'cantidad':
      return [...products].sort((a, b) => a.qty - b.qty || byName(a, b));
    case 'categoria':
      return [...products].sort((a, b) => {
        const nameA = categoryNames.get(a.categoryId) ?? '';
        const nameB = categoryNames.get(b.categoryId) ?? '';
        return nameA.localeCompare(nameB, 'es') || byName(a, b);
      });
    case 'reciente':
      return [...products].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    case 'nombre':
    default:
      return [...products].sort(byName);
  }
}
