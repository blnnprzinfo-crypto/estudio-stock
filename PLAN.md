# Estudio Stock — Plan de fases

Documento vivo. Versión 1 · 6 agosto 2026

---

## Restricciones del proyecto (no negociables)

1. **Coste cero, permanente.** Ninguna dependencia de pago. Ningún servicio cuyo plan gratuito caduque, se degrade o se pause.
2. **Solo inventario.** Nada de clientes, citas, calendario, WhatsApp ni CRM.
3. **Rapidez de uso por encima de todo.** Debe usarse en segundos, con guantes, mientras se tatúa.
4. **Multidispositivo.** iPhone y ordenador, con los mismos datos.
5. **Una sola usuaria** hoy, preparado para más en el futuro sin rehacer.
6. **Calidad sobre velocidad de desarrollo.** Código limpio, modular, tipado, documentado.

## Decisiones de arquitectura tomadas

| Área | Decisión | Motivo |
|---|---|---|
| Framework | React + TypeScript + Vite | Ecosistema y documentación; lo que mejor mantienen los asistentes de IA a largo plazo |
| Estilos | Tailwind CSS | Consistencia sin acumular CSS muerto |
| Datos locales | IndexedDB | Respuesta instantánea, funciona sin cobertura |
| Datos remotos | Cloudflare D1 + Workers | Gratis, uso comercial permitido, sin pausas por inactividad |
| Alojamiento | Cloudflare Pages | Gratis sin caducidad, uso comercial permitido, ancho de banda ilimitado |
| Estrategia | Local-first con sincronización | Une "instantáneo" con "no perder datos nunca" |

**Descartados y por qué:** Supabase (pausa el proyecto a los 7 días de inactividad), Vercel (Hobby prohíbe uso comercial), GitHub Pages (restringe sitios de negocio).

## Estado actual

- Prototipo funcional en un solo `index.html` de 769 líneas, con datos en `localStorage`.
- Ubicado en una carpeta temporal de sesión de Codex. **En riesgo de borrado.**
- Repositorio en GitHub: `blnnprzinfo-crypto/estudio-stock`, último commit 9 julio 2026.
- Sin datos reales que rescatar. El inventario se recontará desde cero.
- De los 14 campos de producto especificados, hay 8. Faltan estadísticas, edición de productos, duplicado, orden y caducidades.

---

## Fases

### Fase 0 — Cimientos
**Estado:** pendiente de arranque

- Mover el proyecto a `Documents\Codex\estudio-stock`, conservando el historial de Git
- Grabar restricciones y decisiones en el repositorio (`DECISIONES.md`, `CLAUDE.md`)
- Crear cuenta de Cloudflare
- Montar el esqueleto: Vite, React, TypeScript, Tailwind, ESLint, Prettier
- Definir estructura de carpetas
- Desplegar una página mínima a Cloudflare Pages para validar la cadena completa

**Terminado cuando:** existe una URL pública que abre desde el móvil, aunque solo diga "hola".

**Herramienta recomendada: Claude.** Hay decisiones de configuración y verificación de límites de servicios. El despliegue inicial conviene hacerlo acompañada.

---

### Fase 1 — Modelo de datos y núcleo
- Esquema completo: `products`, `movements`, `categories`, `suppliers`
- Los 14 campos de producto, más `created_at`, `updated_at`, `archived`
- **Campos de sincronización desde el día uno** (`updated_at`, `device_id`, borrado suave) aunque la sincronización llegue en la Fase 4
- Capa de acceso a IndexedDB, tipada y aislada del resto de la app
- Operaciones básicas y tests de esa capa

**Terminado cuando:** los tests pasan y se pueden crear, leer, editar y borrar productos por consola.

**Herramienta recomendada: modo Plan primero, después Codex.** Es trabajo mecánico y repetitivo, ideal para una sesión larga de implementación. Pero el esquema se revisa antes de escribirlo: un error aquí se paga en todas las fases siguientes.

---

### Fase 2 — Interfaz de inventario
- Lista de productos, buscador instantáneo, filtros y ordenación
- Alta, edición, duplicado y borrado
- **Pantalla de carga inicial rápida**: para meter 150 productos seguidos sin abrir un formulario cada vez
- Diseño visual heredado del prototipo, que ya funciona

**Terminado cuando:** puedes dar de alta el inventario completo cómodamente.

**Herramienta recomendada: Codex** para construir, **Claude** para revisar el resultado visual y de usabilidad.

---

### Fase 3 — Movimientos y ajuste rápido
- Botones `+` / `-` con respuesta instantánea
- Registro de todo cambio con fecha, cantidad, motivo y usuario
- Deshacer persistente, no solo en memoria
- Historial paginado, no la lista entera de golpe

**Terminado cuando:** ajustar stock es más rápido que apuntarlo en papel.

**Herramienta recomendada: Codex.**

> A partir de aquí ya puedes empezar a cargar el inventario real. La Fase 4 subirá al servidor lo que tengas.

---

### Fase 4 — Sincronización y PWA
- Worker en Cloudflare + base de datos D1
- Sincronización en segundo plano, con cola para cuando no haya cobertura
- Subida inicial del inventario cargado en la Fase 3
- Instalación en la pantalla de inicio del iPhone (imprescindible: Safari borra el almacenamiento tras 7 días sin uso si no está instalada)

**Terminado cuando:** cambias algo en el móvil y aparece en el ordenador.

**Herramienta recomendada: Claude.** Es la fase con más criterio y más lectura de documentación externa. También la que más caro sale si se hace mal.

---

### Fase 5 — Alertas
- Aviso al llegar al mínimo y al quedarse sin stock
- Aviso de caducidad próxima
- Pantalla de alertas priorizada

**Herramienta recomendada: Codex.**

---

### Fase 6 — Lista de compra
- Generación automática con los productos bajo mínimo
- Agrupación por proveedor
- Exportar o copiar para pedir

**Herramienta recomendada: Codex.**

---

### Fase 7 — Estadísticas
- Productos con menor stock y más consumidos
- Gasto mensual y anual
- Consumo por categoría
- Evolución del inventario

**Herramienta recomendada: Claude** para decidir qué métricas y cómo representarlas, **Codex** para implementarlas. Es la fase donde una mala decisión de diseño se nota más, porque son datos que hay que interpretar de un vistazo.

---

### Fase 8 — Pulido y cierre
- Revisión de rendimiento con el inventario real cargado
- Accesibilidad y uso con guantes: tamaños de pulsación, contraste
- Exportar e importar copia de seguridad
- Acentos y textos revisados
- Documentación de uso y de mantenimiento

**Herramienta recomendada: Claude.** Es una auditoría, y auditar es distinto de construir.

---

## Cómo repartir el trabajo entre herramientas

**La regla corta: Claude para decidir y revisar, Codex para teclear.**

**Claude (esta sesión)** rinde mejor cuando hay que investigar y verificar antes de decidir, comparar alternativas con criterio, auditar código existente o revisar un resultado con ojo crítico. Tiene acceso a tus carpetas y a búsqueda web, así que comprueba las cosas en lugar de suponerlas.

**Codex** rinde mejor en sesiones largas de implementación dentro del repositorio: muchos ficheros, ejecutar tests, iterar hasta que todo pasa en verde. Es donde el trabajo es más mecánico y el criterio ya está tomado.

**Modo Plan** merece la pena al empezar cualquier fase que toque el modelo de datos o cambie varios ficheros a la vez. Las Fases 1, 4 y 7 son las candidatas claras.

**Aviso honesto:** esta recomendación te la doy yo, que soy una de las dos opciones. Contrástala. Si Codex te está resolviendo bien una fase que aquí aparece asignada a Claude, sigue con Codex — lo que importa es que cada fase termine con criterios de aceptación cumplidos, no quién la escriba.

## Regla de trabajo entre fases

Ninguna fase empieza sin que la anterior cumpla su criterio de "terminado cuando". Y ningún cambio grande se implementa sin explicar antes qué cambia, por qué, y qué riesgos tiene.
