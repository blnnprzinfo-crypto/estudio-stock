# Decisiones del proyecto

Este documento manda. Cualquier propuesta técnica tiene que pasar estos filtros antes de considerarse.

Última actualización: 6 agosto 2026

---

## Restricciones no negociables

1. **Coste cero, permanente.** Ninguna dependencia de pago. Ningún servicio cuyo plan gratuito caduque, se degrade con el tiempo o se pause por inactividad. Si una herramienta es gratis "de momento", no entra.

2. **Solo inventario.** Nada de clientes, citas, calendario, WhatsApp ni CRM. Este proyecto no se mezcla con ningún otro.

3. **Rapidez de uso por encima de todo.** Debe poder usarse en segundos, con guantes, mientras se tatúa. Si una función es correcta pero lenta de usar, está mal.

4. **Multidispositivo.** iPhone y ordenador, con los mismos datos.

5. **Una sola usuaria hoy**, preparado para más en el futuro sin rehacer la arquitectura.

6. **Calidad sobre velocidad de desarrollo.** Código limpio, modular, tipado y documentado. Sin duplicidades. Sin dependencias que no aporten valor claro.

## Decisiones de arquitectura

| Área | Decisión | Motivo |
|---|---|---|
| Framework | React + TypeScript + Vite | Ecosistema y documentación amplios; es lo que mejor mantienen los asistentes de IA a largo plazo |
| Estilos | Tailwind CSS | Consistencia visual sin acumular CSS muerto |
| Datos locales | IndexedDB | Respuesta instantánea, funciona sin cobertura |
| Datos remotos | Cloudflare D1 + Workers | Gratis, uso comercial permitido, sin pausas por inactividad |
| Alojamiento | Cloudflare Workers con assets estáticos | Gratis sin caducidad, uso comercial permitido, ancho de banda ilimitado. Desplegado en `estudio-stock.blnnp.workers.dev` |
| Estrategia de datos | Local-first con sincronización en segundo plano | Une "instantáneo" con "no perder datos nunca" |

### Alternativas descartadas

- **Supabase** — el plan gratuito pausa el proyecto tras 7 días de inactividad. Quitarlo cuesta 25 $/mes. Incumple la restricción 1.
- **Vercel** — el plan Hobby prohíbe expresamente el uso comercial y se reservan el derecho de retirar el despliegue sin aviso.
- **GitHub Pages** — restringe sitios dirigidos a actividad de negocio.
- **Almacenamiento puramente local sin sincronización** — descartado al confirmar el uso desde móvil y ordenador: produciría dos inventarios independientes.
- **Motor de sincronización local-first completo** — descartado por complejidad. Con una sola usuaria basta con: registro de movimientos que solo crece (sin conflictos por naturaleza) y "gana la edición más reciente" para los productos.

## Notas técnicas a tener presentes

- **El despliegue es un Worker, no Pages.** Ventaja para la Fase 4: el mismo Worker que sirve la aplicación puede exponer la API y enlazar con D1, sin necesidad de un segundo servicio.

- **Safari en iPhone borra el almacenamiento local tras 7 días sin uso** si la app no está instalada en la pantalla de inicio. La instalación es obligatoria, no opcional. La sincronización sirve además de red de seguridad si ocurriera.
- **El código no va en OneDrive.** La copia de seguridad del código es GitHub. OneDrive sincronizando un repositorio solo añade riesgo de corrupción.
- **El repositorio es público a día de hoy.** Hoy no contiene nada sensible. Revisar antes de introducir credenciales de Cloudflare (Fase 4).

## Estado del inventario de datos

El inventario se recuenta desde cero. El Google Sheets antiguo queda descartado por desactualizado. Volumen estimado: 100-150 productos.

Consecuencia de diseño: **el alta masiva de productos necesita pantalla propia**, porque el primer uso real consiste en cargar 150 productos seguidos.

## Reglas de trabajo

- Ninguna fase empieza sin que la anterior cumpla su criterio de "terminado cuando".
- Ningún cambio grande se implementa sin explicar antes qué cambia, por qué, y qué riesgos tiene.
- Los errores se explican y se comparan soluciones antes de arreglarlos. No se parchea sobre la marcha.
