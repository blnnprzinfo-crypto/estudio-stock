# Estudio Stock

Gestión de inventario para estudio de tatuaje. Aplicación web instalable, pensada para usarse en segundos desde el móvil mientras se tatúa.

Ver [`DECISIONES.md`](DECISIONES.md) para las restricciones del proyecto y [`PLAN.md`](PLAN.md) para el plan de fases.

## Puesta en marcha

Necesitas [Node.js](https://nodejs.org) instalado (versión 20 o superior).

```bash
npm install     # solo la primera vez
npm run dev     # arranca en http://localhost:5173
```

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción en `dist/` |
| `npm run preview` | Sirve el resultado de `build` para comprobarlo |
| `npm run lint` | Revisa el código |

## Despliegue en Cloudflare Pages

Conectar el repositorio de GitHub y usar esta configuración:

- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Build output directory:** `dist`

Cada `push` a `master` despliega automáticamente.

## Estructura

```
src/
  components/   Componentes de interfaz reutilizables
  features/     Cada área funcional: inventario, movimientos, alertas, compra, estadísticas
  db/           Acceso a IndexedDB y esquema de datos
  lib/          Utilidades sin dependencias de interfaz
  types/        Tipos compartidos
legacy/         Prototipo original en un solo HTML. Sigue funcionando. Se elimina al completar la Fase 3.
```

## Stack

React · TypeScript · Vite · Tailwind CSS · IndexedDB · Cloudflare Pages y D1

Todo el stack es gratuito de forma permanente. Es una restricción del proyecto, no una casualidad.
