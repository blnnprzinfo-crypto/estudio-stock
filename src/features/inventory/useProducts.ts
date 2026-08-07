import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAllProducts } from '../../db/products.js';
import { getAllCategories } from '../../db/categories.js';
import { getAllSuppliers } from '../../db/suppliers.js';
import { seedCategories, seedSuppliers } from '../../db/seed.js';
import type { Category, ID, Product, Supplier } from '../../types/index.js';

interface UseProductsResult {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  categoryNames: Map<ID, string>;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Carga productos y categorías desde IndexedDB.
 *
 * No escribe nada: las pantallas que modifican datos llaman a la capa de datos
 * y luego a reload(). Así ninguna pantalla de esta fase toca `qty`.
 */
export function useProducts(): UseProductsResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const [nextProducts, nextCategories, nextSuppliers] = await Promise.all([
      getAllProducts(),
      getAllCategories(),
      getAllSuppliers(),
    ]);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setSuppliers(nextSuppliers);
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await seedCategories();
        await seedSuppliers();
        const [nextProducts, nextCategories, nextSuppliers] = await Promise.all([
          getAllProducts(),
          getAllCategories(),
          getAllSuppliers(),
        ]);
        if (cancelled) return;
        setProducts(nextProducts);
        setCategories(nextCategories);
        setSuppliers(nextSuppliers);
      } catch (cause) {
        if (cancelled) return;
        setError(
          cause instanceof Error ? cause.message : 'No se pudo abrir el inventario'
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Se recalcula solo cuando cambian las categorías, no en cada pulsación
  // del buscador, que es quien redibuja la lista.
  const categoryNames = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );

  return { products, categories, suppliers, categoryNames, loading, error, reload };
}
