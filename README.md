# Farma-Check — Front-end del usuario final

Interfaz web para el personal de mostrador de la farmacia: consulta de stock, registro de movimientos,
control de vencimientos y gestión de órdenes de compra. Consume la API REST del back-end Rails
([Kano55K/Farma-Check](https://github.com/Kano55K/Farma-Check), contrato en `docs/api/`).

El back-office de administración sigue en Rails; este front es el contexto del **usuario final**.

## Stack

| Uso | Tecnología |
|---|---|
| UI | React 19 + TypeScript |
| Build y servidor de desarrollo | Vite 8 |
| Ruteo | React Router 7 |
| Datos del servidor (caché, reintentos, invalidación) | TanStack Query 5 |
| Estilos | Tailwind CSS 4 (componentes propios, sin UI kits) |
| Tests | Vitest + Testing Library + MSW (respuestas simuladas) |
| E2E | Playwright (contra la API real) |
| Lint | oxlint |

## Requisitos

- Node.js 24 (probado con 24.12.0) y npm 11 (11.7.0).
- El back-end corriendo en http://localhost:3000 con los seeds cargados (ver el README del back-end).

## Instalación y ejecución

```bash
cp .env.example .env     # en PowerShell: Copy-Item .env.example .env
npm install
npm run dev              # http://localhost:5173
```

Credenciales de demo (seeds del back-end): `empleado@farma-check.com` / `demo1234` y `admin@farma-check.com` / `demo1234`.

## Variables de entorno

| Variable | Ejemplo | Uso |
|---|---|---|
| `VITE_API_URL` | `http://localhost:3000/api/v1` | URL base de la API, sin barra final |

El back-end debe permitir el origen del front en CORS (`FRONTEND_ORIGIN`, por defecto `http://localhost:5173`).

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en el puerto 5173 |
| `npm run build` | Chequeo de tipos (`tsc -b`) y build de producción en `dist/` |
| `npm run preview` | Sirve el build de producción |
| `npm run lint` | oxlint (reglas de React, hooks y accesibilidad básicas) |
| `npm run test` | Tests de componentes con Vitest + Testing Library + MSW |
| `npm run e2e` | Guion de la demo con Playwright **contra la API real** (back-end en :3000 con seeds; levanta Vite si no está corriendo). La primera vez: `npx playwright install chromium` |

## Estructura

```
src/
├── api/
│   ├── client.ts        # fetch central: token Bearer, formato único de error (ApiError), 401 → logout, 403 → aviso
│   └── endpoints.ts     # una función por endpoint de la API
├── auth/
│   ├── session.ts       # token + vencimiento + usuario en localStorage
│   ├── AuthContext.tsx  # login/logout, cierre automático al vencer el token o ante un 401
│   ├── useAuth.ts       # hook y tipos del contexto
│   └── ProtectedRoute.tsx  # rutas con sesión y <AdminOnly> para acciones de administrador
├── components/          # Layout (menú colapsable), Badge (semáforo), Field (inputs accesibles),
│                        # Modal, MovementForm, Pagination, States (carga/vacío/error), Toast, ErrorBoundary
├── hooks/useDebounce.ts
├── lib/                 # formatos (fechas, moneda), etiquetas de enums, QueryClient
├── pages/               # una pantalla por archivo
├── test/                # setup de Vitest, servidor MSW y tests
└── types/api.ts         # tipos de las respuestas de la API
e2e/demo.spec.ts         # Playwright: flujos de la demo contra la API real
```

## Pantallas

| Ruta | Pantalla |
|---|---|
| `/login` | Inicio de sesión (con aviso si la sesión expiró) |
| `/` | Inicio: KPIs, alertas de vencimiento y stock, accesos rápidos |
| `/productos` | Buscador con debounce, filtros (laboratorio, estado de stock, receta) y paginación en la URL |
| `/productos/:id` | Detalle, stock total y lotes con semáforo; registrar movimiento en un modal |
| `/movimientos/nuevo` | Registrar movimiento eligiendo producto y lote |
| `/vencimientos` | Lotes por estado (vencido / crítico / alerta / ok), ordenados por fecha |
| `/movimientos` | Historial con filtros por tipo y rango de fechas |
| `/proveedores`, `/proveedores/:id` | Listado y detalle; alta y edición visibles solo para admin |
| `/ordenes`, `/ordenes/nueva`, `/ordenes/:id` | Listado por estado, alta con ítems dinámicos y total en vivo, detalle con enviar, cancelar (admin) y recibir |
| cualquier otra | 404; además hay una página de error genérica (ErrorBoundary) |

## Decisiones de diseño

- **Capa de API única** (`src/api/client.ts`): todas las peticiones pasan por `apiRequest`, que agrega el
  token, convierte el error de la API (`{ error: { code, message, details } }`) en un `ApiError` y emite
  eventos globales: un **401** cierra la sesión y vuelve al login con "Tu sesión expiró"; un **403** muestra
  un aviso de permisos.
- **Sesión**: el token y su `expires_at` se guardan en `localStorage`; al vencer, la sesión se cierra sola
  aunque no haya peticiones. El rol decide qué acciones se muestran (`<AdminOnly>`), y la API vuelve a
  validar los permisos (403).
- **TanStack Query** para el estado del servidor: caché por filtros, `keepPreviousData` para paginar sin
  parpadeos, sin reintentos ante errores 4xx e invalidación de productos, lotes, movimientos y dashboard
  después de cada operación (el stock se refresca solo).
- **Filtros en la URL** (`useSearchParams`): se pueden compartir y el botón "atrás" funciona.
- **Validación en dos niveles**: el formulario valida lo básico antes de enviar y además muestra por campo
  los errores de `details` de la API. El stock disponible lo valida el servidor (la fuente de verdad), y el
  422 de "stock insuficiente" se muestra debajo del campo cantidad.
- **Evitar envíos repetidos**: los botones se deshabilitan y muestran "Guardando…", "Ingresando…",
  "Confirmando recepción…" mientras la petición está en curso.
- **Estados de UX**: esqueletos de carga, mensajes de "sin resultados" con acción para limpiar filtros,
  errores con botón **Reintentar** y toasts de confirmación.
- **Responsive**: barra lateral en escritorio y menú colapsable en celulares; las tablas (`.table-cards`)
  se transforman en tarjetas por debajo de 768 px.
- **Accesibilidad**: cada input tiene su `<label>` y el error asociado con `aria-describedby` /
  `aria-invalid`; foco visible en verde; modal con `<dialog>` (foco atrapado, Escape para cerrar);
  `aria-live` en toasts y estados de carga; enlace "Saltar al contenido"; el semáforo siempre lleva texto,
  no solo color.
- Colores y estructura siguen los wireframes del proyecto (verde farmacia, barra lateral, badges del semáforo).

## Integración con la API

| Pantalla | Endpoints |
|---|---|
| Login / logout | `POST /login`, `DELETE /logout` |
| Inicio | `GET /dashboard` |
| Productos y detalle | `GET /products`, `GET /products/:id` |
| Registrar movimiento | `GET /batches?product_id=`, `POST /stock_movements` |
| Vencimientos | `GET /batches` |
| Historial | `GET /stock_movements` |
| Proveedores | `GET /suppliers`, `GET /suppliers/:id`, `POST /suppliers`, `PATCH /suppliers/:id` |
| Órdenes | `GET /purchase_orders`, `POST /purchase_orders`, `GET /purchase_orders/:id`, `PATCH …/send`, `PATCH …/cancel`, `POST …/receive` |

## Pruebas

- `npm run test` (9 tests): login correcto e incorrecto, validación del login, ruta protegida que redirige,
  401 que vuelve al login, registro de movimiento exitoso (con refresco del stock), error 422 de stock
  insuficiente mostrado en el campo, validación en el cliente y botón "Guardando…" deshabilitado.
- `npm run e2e` (Playwright, API real): empleado busca y registra una salida, error de stock insuficiente,
  admin crea/envía/recibe una orden y el lote nuevo suma stock, logout y token inválido, y vista móvil.
