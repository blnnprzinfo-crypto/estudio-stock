# Fase 2 — Interfaz de inventario

Leer antes `DECISIONES.md` y `docs/FASE-1-MODELO-DATOS.md`.

**Alcance: la pantalla de inventario y el alta de productos. Nada de ajustar stock (eso es Fase 3), nada de sincronización, nada de estadísticas.**

---

## Contexto de uso

La app se usa con guantes, de pie, con una mano, mientras se tatúa. Cada interacción que requiera precisión o varios pasos es un fallo de diseño.

Excepción: **la carga inicial de 150 productos se hará desde el ordenador con teclado.** Esa pantalla se optimiza para teclado, no para dedo.

## Pantallas

### 1. Lista de inventario (principal)

- Buscador siempre visible, **filtra según se escribe**
- Filtro por categoría
- Ordenación: nombre, cantidad, categoría, más reciente
- Cada fila muestra: emoji, nombre, detalle (marca y formato), cantidad, unidad y mínimo
- Los productos en el mínimo o por debajo se distinguen visualmente
- Pulsar una fila abre el detalle del producto

### 2. Detalle / edición de producto

- Todos los campos editables **menos la cantidad**
- La cantidad se muestra, pero no se edita aquí: se cambia con movimientos en la Fase 3
- Acciones: guardar, duplicar, borrar
- Borrar pide confirmación y hace borrado suave

### 3. Alta rápida (carga inicial)

Pensada para meter 150 productos seguidos desde el ordenador.

- Formato de tabla: una fila por producto
- Se avanza entre campos con el tabulador y se crea fila nueva con Enter
- Sin abrir ni cerrar ventanas entre producto y producto
- Campos en la fila: nombre, categoría, cantidad, unidad, mínimo, coste
- El resto de campos se rellenan luego desde el detalle
- Guardado en bloque con `createProductsBulk`

### 4. Alta individual

Formulario completo con todos los campos, para añadir un producto suelto.

## Reglas técnicas

1. **La cantidad no se edita desde la interfaz de producto.** Ninguna pantalla de esta fase llama a nada que escriba `qty`.
2. **Escribir en el buscador no puede redibujar la lista entera.** Usar `useMemo` y `useDeferredValue`. Este fue un fallo real del prototipo anterior.
3. **Los desplegables no se reconstruyen en cada pulsación.** Otro fallo del prototipo: el filtro de categorías se cerraba solo al escribir.
4. **Sin librería de rutas.** Con cuatro pantallas basta con estado. Se revisará si hace falta.
5. **Sin librería de componentes.** Tailwind y componentes propios.
6. Toda zona pulsable mide **44 píxeles como mínimo**.
7. Los textos van **en español y con acentos correctos**. El prototipo los omitía.

## Diseño visual

Se hereda del prototipo (`legacy/index.html`), que funciona bien:

- Ancho máximo de 460 px, centrado, sobre fondo neutro
- Color principal `--color-teal` (#075f5d), avisos en `--color-amber`, errores en `--color-danger`
- Tipografía del sistema, pesos altos para los números
- Pestañas arriba, resumen fijo abajo

Ya están definidos en `src/index.css`.

## Estructura de ficheros

```
src/features/inventory/
  InventoryList.tsx       Lista, búsqueda, filtros, orden
  ProductRow.tsx          Una fila
  ProductDetail.tsx       Detalle y edición
  ProductForm.tsx         Alta individual
  BulkEntry.tsx           Alta rápida en tabla
  useProducts.ts          Hook de acceso a datos
src/components/
  (componentes reutilizables: campo, botón, diálogo, estado vacío)
```

## Criterios de aceptación

- [ ] `npm run build` y `npx vitest run` pasan limpios
- [ ] Buscar entre 150 productos no produce retraso perceptible al teclear
- [ ] Se pueden dar de alta 150 productos en la pantalla rápida **sin tocar el ratón**
- [ ] Ninguna pantalla permite editar la cantidad directamente
- [ ] El filtro de categoría no se cierra al escribir en el buscador
- [ ] Borrar un producto lo oculta pero conserva sus movimientos
- [ ] Toda zona pulsable llega a 44 píxeles
- [ ] Funciona en pantalla de 390 píxeles de ancho sin desbordes ni scroll horizontal

## Fuera del alcance

Ajustar stock con `+` y `-`. Historial de movimientos. Alertas. Lista de compra. Estadísticas. Sincronización. Instalación como PWA.
