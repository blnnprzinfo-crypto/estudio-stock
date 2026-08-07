# Fase 1 — Modelo de datos y núcleo

Especificación aprobada. Leer también `DECISIONES.md` antes de implementar.

**Alcance de esta fase: solo la capa de datos. Nada de interfaz.**

---

## Reglas que no se pueden romper

1. **El stock solo cambia a través de `applyMovement()`.** Ninguna otra función escribe `product.qty` directamente. Esta es la regla más importante del proyecto: es lo que garantiza que la cantidad y el historial nunca se separen.
2. **Los movimientos no se editan ni se borran.** Es un registro que solo crece. Corregir un error se hace con un movimiento nuevo de tipo `ajuste`.
3. **Nada se borra de verdad.** Borrar rellena `deletedAt`. Las consultas normales filtran los borrados.
4. **Todo registro lleva `updatedAt` y `deviceId`** aunque la sincronización no llegue hasta la Fase 4. Añadirlos después obligaría a migrar datos ya cargados.

## Tecnología

- **Dexie** como capa sobre IndexedDB. Es una dependencia justificada: ahorra mucho código repetitivo, es MIT y está mantenida. Sin ella habría que escribir a mano el manejo de transacciones e índices.
- Sin ninguna otra dependencia nueva en esta fase.

## Tipos

```ts
type ID = string;              // uuid v4, vía crypto.randomUUID()
type ISODate = string;         // "2026-08-06"
type ISODateTime = string;     // "2026-08-06T12:30:00.000Z"

interface Product {
  id: ID;
  name: string;                // obligatorio
  brand: string | null;        // marca
  categoryId: ID;
  supplierId: ID | null;       // proveedor
  format: string | null;       // "caja 20 ud", "240 ml"
  qty: number;                 // admite decimales (ml, gramos)
  minQty: number;              // stock mínimo
  unit: string;                // "ud", "ml", "caja"
  unitCost: number;            // coste por unidad, en euros
  barcode: string | null;
  emoji: string;               // por defecto "📦"
  purchasedAt: ISODate | null;
  expiresAt: ISODate | null;   // campo secundario: pocos productos lo usan
  location: string | null;     // ubicación física
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
  deviceId: string;
}

type MovementReason = 'uso' | 'compra' | 'ajuste' | 'merma' | 'inicial';

interface Movement {
  id: ID;
  productId: ID;
  delta: number;               // positivo o negativo, nunca cero
  reason: MovementReason;      // por defecto 'uso'
  qtyAfter: number;            // stock resultante tras aplicar el movimiento
  unitCost: number | null;     // solo se rellena cuando reason === 'compra'
  note: string | null;
  createdAt: ISODateTime;
  userId: ID | null;           // siempre null por ahora; preparado para multiusuario
  deviceId: string;
}

interface Category {
  id: ID;
  name: string;
  emoji: string;
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}

interface Supplier {
  id: ID;
  name: string;
  website: string | null;
  notes: string | null;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  deletedAt: ISODateTime | null;
}
```

### Por qué algunos campos existen

- **`qtyAfter`** permite auditar y reconstruir el historial sin recalcular toda la cadena de movimientos.
- **`unitCost` en el movimiento de compra** guarda lo que se pagó realmente en ese momento. Sin él, el gasto mensual sería una estimación con el precio de hoy.
- **`productId` como referencia**, nunca el nombre del producto. Renombrar un producto no debe desligar su historial. Este era el fallo del prototipo anterior.

## Índices de IndexedDB

- `products`: `id`, `name`, `categoryId`, `supplierId`, `barcode`, `deletedAt`, `updatedAt`
- `movements`: `id`, `productId`, `createdAt`, `reason`
- `categories`: `id`, `name`, `sortOrder`, `deletedAt`
- `suppliers`: `id`, `name`, `deletedAt`

## Categorías iniciales

Se crean al inicializar la base de datos por primera vez:

Agujas · Cartuchos · Tintas · Guantes · Film · Stencil · Green Soap · Vaselina · Papel · Productos de limpieza · Material desechable · Mobiliario · Electrónica · Accesorios · Otros

## Ficheros a crear

```
src/db/
  db.ts            Definición de Dexie, esquema y migraciones
  seed.ts          Categorías iniciales
  products.ts      Alta, edición, borrado suave, duplicado, búsqueda
  movements.ts     applyMovement() y consultas de historial
  categories.ts    CRUD
  suppliers.ts     CRUD
  index.ts         Superficie pública del módulo
src/types/
  index.ts         Los tipos de arriba
src/lib/
  device.ts        Obtiene o genera el deviceId, persistido en localStorage
  ids.ts           Generación de identificadores
```

## Funciones clave

```ts
// La única vía para cambiar stock. Actualiza qty y escribe el movimiento
// dentro de una misma transacción: o pasan las dos cosas, o ninguna.
applyMovement(input: {
  productId: ID;
  delta: number;
  reason?: MovementReason;     // por defecto 'uso'
  unitCost?: number;           // solo si reason === 'compra'
  note?: string;
}): Promise<Movement>

// Reconstruye product.qty sumando todos sus movimientos.
// Es la red de seguridad por si la cantidad guardada se desviara.
recalculateQty(productId: ID): Promise<number>

// Alta masiva para la carga inicial, en una sola transacción.
// Cada producto genera su movimiento 'inicial'.
createProductsBulk(products: NewProduct[]): Promise<Product[]>
```

## Criterios de aceptación

La fase está terminada cuando todo esto se cumple:

- [ ] Los tests pasan con `npm test`
- [ ] `npm run build` compila sin errores ni avisos de TypeScript
- [ ] `applyMovement` actualiza cantidad e historial de forma atómica: si falla una parte, no se escribe nada
- [ ] `recalculateQty` devuelve exactamente la cantidad guardada tras una serie de movimientos aleatorios
- [ ] El stock nunca puede quedar negativo: un movimiento que lo dejaría bajo cero se rechaza con un error claro
- [ ] Borrar un producto conserva sus movimientos y no aparece en las consultas normales
- [ ] `createProductsBulk` da de alta 150 productos en menos de un segundo
- [ ] Ninguna función fuera de `movements.ts` escribe `product.qty`

## Fuera del alcance de esta fase

Nada de interfaz. Nada de React. Nada de sincronización, Cloudflare ni D1. Nada de estadísticas. La carpeta `legacy/` no se toca.
