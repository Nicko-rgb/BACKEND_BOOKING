# Contexto del proyecto — Booking Sport

> Documento para Claude: carga este archivo al inicio de cada sesión para evitar re-explorar el proyecto.
> Última actualización: 2026-04-05

---

## Descripción

SaaS multi-tenant de reservas de canchas deportivas.  
Modelo de negocio: las empresas/sucursales pagan suscripción mensual/anual para usar el sistema.  
La plataforma **no cobra comisión** por reserva.

---

## Estructura del repositorio

```
proyecto_booking_sport/
├── BACKEND_BOOKING/      Node.js + Express + Sequelize + PostgreSQL
├── ADMINISTRATOR_BOOKING/ React (Vite) — panel admin (empresa/sucursal)
├── FRONTEND_BOOKING/     React (Vite) — portal del cliente (usuario final)
├── CLAUDE.md             Reglas de código y arquitectura (SIEMPRE respetar)
├── STRIPE_CONNECT_GUIDE.md  Guía de implementación Stripe Connect
└── PROJECT_CONTEXT.md    Este archivo
```

---

## Puertos en desarrollo

| Servicio | Puerto |
|----------|--------|
| Backend API | `5010` |
| Admin frontend | probablemente `5173` o `5174` |
| Portal usuario | probablemente `5173` |
| Redis | `6379` |
| PostgreSQL | `5432`, DB: `db_sport` |

---

## Backend (`BACKEND_BOOKING/`)

### Stack
- Node.js + Express
- Sequelize ORM → PostgreSQL
- Redis (caché, `cacheUtility.js`)
- Socket.io (reservas en tiempo real)
- JWT para auth
- Stripe (PaymentIntents)
- Multer (uploads de imágenes)
- Joi (validación de DTOs)

### Arquitectura de capas (obligatoria, no saltarse)
```
Request → Route (+DTO) → Controller → Handler → Service → Repository → DB
```

| Capa | Responsabilidad |
|------|----------------|
| Route | HTTP método+path, middlewares, no lógica |
| Controller | Extrae de req, llama al Handler |
| Handler | Llama Service, formatea respuesta con `ApiResponse` |
| Service | Toda la lógica de negocio, lanza errores semánticos |
| Repository | Único punto de acceso a DB (Sequelize) |

### Módulos backend (`src/modules/`)

| Módulo | Descripción |
|--------|-------------|
| `users/` | Auth, login (admin+booking), users CRUD, permisos, UserCompany |
| `facility/` | Company, Configuration, Space, BusinessHour, PaymentAccount, ConfigurationPayment, MediaRepository |
| `booking/` | Reservas, holds, estrategias de pago, webhooks Stripe |
| `catalogs/` | Country, PaymentType, SportType, SurfaceType, PaymentType por país |
| `reports/` | Dashboard/inicio |
| `media/` | Gestión de archivos/imágenes |
| `notification/` | Notificaciones |

### Shared backend (`src/shared/`)

| Archivo | Función |
|---------|---------|
| `middlewares/proteger.js` | Combina middlewares: `protegerPermiso(...perms)` = token+perm, `protegerPermisoConScope(...perms)` = token+perm+scope |
| `middlewares/verificarPermiso.js` | Valida `req.user.permissions[]`. `system.full_access` bypasea todo |
| `middlewares/verificarScope.js` | Valida `company_ids[]` del JWT. Bypasea si `role=system`, `system.full_access` o `company.manage_all` |
| `middlewares/verificarTokenAuth.js` | Verifica JWT, escribe `req.user` |
| `middlewares/validateDTO.js` | `validateDTO(schema)` → valida body → `req.validatedData`. `validateQuery(schema)` → `req.validatedQuery` |
| `utils/ApiResponse.js` | `.ok(res,data,msg)` `.created()` `.noContent()` `.error()` — respuesta estándar |
| `utils/extractUserContext.js` | Construye `{ user_id, role, roles, company_ids, tenant_id, permissions, isSystem, isManageAll }` desde `req.user` |
| `utils/cacheUtility.js` | Redis wrapper: `withCache`, `get`, `set`, `del`, `delByPattern`, `generateKey` |
| `errors/CustomErrors.js` | `ValidationError`, `NotFoundError`, `ConflictError`, `ForbiddenError`, `BadRequestError`, `UnauthorizedError` |
| `handlers/GlobalErrorHandler.js` | Captura errores semánticos, `asyncHandler(fn)` envuelve controladores |

### Modelos clave (tablas con prefijo `dsg_bss_`)

| Modelo | Tabla | Notas clave |
|--------|-------|-------------|
| `User` | `dsg_bss_users` | `role` (VARCHAR, no array). Roles: `system`, `super_admin`, `administrador`, `empleado`, `cliente` |
| `UserPermission` | `dsg_bss_user_permissions` | Permisos directos por usuario. Ya no hay tabla de roles intermedios |
| `UserCompany` | `dsg_bss_user_company` | Asignación usuario→empresa/sucursal |
| `Company` | `dsg_bss_company` | Empresa principal (`parent_company_id=null`) o sucursal. Cada una tiene `country_id` propio |
| `Configuration` | `dsg_bss_configuration` | Config por sucursal: redes sociales, logo, etc. Campos Stripe pendientes de añadir |
| `ConfigurationPayment` | `dsg_bss_configuration_payment` | Métodos de pago activos por sucursal + `sort_order` |
| `PaymentAccount` | `dsg_bss_payment_account` | Cuentas bancarias/Yape/QR por sucursal y tipo de pago |
| `PaymentType` | `dsg_bss_payment_types` | Por país (`country_id`). `code` único por país. Provider: Stripe, etc. |
| `Space` | `dsg_bss_spaces` | Espacios deportivos de una sucursal |
| `Booking` | (booking module) | Reservas. Status: CONFIRMED, PENDING, CANCELLED |
| `PaymentBooking` | (booking module) | Pago asociado a grupo de reservas |
| `BookingHold` | (booking module) | Hold temporal mientras usuario reserva |

### JWT payload (admin)
```js
{
  user_id, name, email,
  role,        // string: 'system' | 'super_admin' | 'administrador' | 'empleado'
  permissions, // string[] — leído de UserPermission en login
  company_ids, // number[] — todos los IDs accesibles (empresa + sucursales). [] para system
  tenant_id,   // string | null — del primer registro en UserCompany. null para system
  app: 'admin'
}
```

### Sistema de acceso por permisos (no por rol)

**Regla:** Todo control de acceso usa `permissions[]`, no `role`.

| Permiso clave | Significado |
|---------------|-------------|
| `system.full_access` | Bypasea TODOS los checks |
| `company.manage_all` | Ve todas las empresas (bypasea filtro `company_ids`) |
| `company.manage_own` | Ve solo sus empresas asignadas |
| `facility.manage_own` | Gestiona instalaciones de sus sucursales |
| `booking.view_facility` | Ve reservas de su sucursal |
| `booking.confirm` | Confirma/rechaza pagos |

**Permisos por defecto al crear usuario:**
```
cliente:        booking.create, booking.view_own, booking.cancel_own, payment.create, rating.create, profile.edit_own
empleado:       booking.create, booking.view_facility, booking.confirm, booking.cancel, space.view, payment.reorder
administrador:  facility.manage_own, space.manage_own, space.view, business_hour.manage, media.manage_facility,
                rating.view_facility, booking.view_facility, booking.confirm, booking.cancel, payment.reorder,
                employee.manage_own, reports.view, statistics.view
super_admin:    todos los anteriores + company.manage_own, subsidiary.manage_own, payment_account.manage,
                administrator.manage_own, config.user_assign
system:         system.full_access (+ todos en systemUserSeed)
```

### Lógica multi-tenant

- `tenant_id` = agrupación de datos de una empresa (padre + sucursales del mismo árbol)
- `company_ids[]` = lista exacta de IDs a los que el usuario tiene acceso (incluye padre + todas sus sucursales)
- Una sucursal **puede estar en un país diferente** al de su empresa padre
- Un `super_admin` puede tener empresas en **distintos tenants** (distintas empresas raíz)
- `getUserCompanyAccess(userId)` en `UserRepository` expande todas las sucursales de todos los tenants del super_admin

### Estrategias de pago (`src/modules/booking/strategies/`)

| Archivo | Code | Descripción |
|---------|------|-------------|
| `CashPaymentStrategy.js` | `CASH` | Efectivo presencial, status `PENDING` hasta confirmar admin |
| `YapePaymentStrategy.js` | `YAPE` | Billetera digital Perú |
| `PlinPaymentStrategy.js` | `PLIN` | Billetera digital Perú |
| `BankTransferPaymentStrategy.js` | `BANK_TRANSFER` | Transferencia bancaria |
| `CardOnlinePaymentStrategy.js` | `CARD_ONLINE` | Stripe PaymentIntents, status `CONFIRMED` directo |
| `PaymentStrategyFactory.js` | — | Resuelve strategy por `code` |

Flujo Stripe actual (una cuenta plataforma):
```
1. POST /bookings/payment-intent → backend crea PI, devuelve client_secret
2. Frontend confirma con Stripe.js (card data nunca llega al backend)
3. POST /bookings con payment_details.payment_intent_id → CardOnlinePaymentStrategy verifica PI
4. Webhook /bookings/webhooks/stripe como capa de confiabilidad
```

**Pendiente implementar:** Stripe Connect Express (ver `STRIPE_CONNECT_GUIDE.md`) para que el dinero vaya directo a la cuenta de cada sucursal.

### Variables de entorno backend
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
PORT=5010, NODE_ENV
JWT_SECRET, JWT_EXPIRES=24h
FRONTEND_URL, CORS_ORIGIN
REDIS_ENABLED, REDIS_URL, REDIS_TTL
STRIPE_SECRET_KEY, STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET
SEED_INITIAL_DATA
```

---

## Admin Frontend (`ADMINISTRATOR_BOOKING/`)

### Stack
- React + Vite
- React Router DOM
- Axios (via `axiosInstance`)
- React Hot Toast
- Lucide React (iconos)
- ReactFlow (flujo de métodos de pago)

### Estructura de módulos

```
src/
├── modules/
│   ├── auth/         Login, AuthContext, PrivateRoute
│   ├── facilities/   Empresas, sucursales, configuración, pagos, espacios
│   ├── bookings/     Reservas, calendario, pagos (vista admin)
│   ├── users/        Gestión de usuarios y permisos
│   ├── reports/      Dashboard/reportes
│   └── stadistics/   Estadísticas
├── shared/
│   ├── components/   Componentes reutilizables (ver abajo)
│   ├── hooks/        Hooks compartidos
│   ├── services/     Services compartidos
│   ├── utils/        axiosInstance, errorHandler, formarText
│   ├── pages/        AppAdmin.jsx (layout principal con sidebar)
│   └── styles/       Variables CSS globales
└── App.jsx           Router + guards de permisos
```

### Componentes shared reutilizables

Siempre usar estos antes de crear nuevos:
```
Button, Modal, InputField, SelectField, FormRow, FormActions, Table,
SearchSelect, StatCard, Switch, ScreensMsg, RequirePermission
```
Importar desde `shared/components/index.js`.

### Hooks shared
```
useCatalogs.js   — catalogs.paymentTypes, catalogs.countries, etc. + loadPaymentTypes()
usePermission.js — can(perm), canAny(...perms)
useSocket.js     — subscribe(event, cb) para websocket de reservas
```

### AuthContext (`modules/auth/context/AuthContext.jsx`)
Provee: `token, user, role, permissions, companyIds, tenantId, isAuthenticated, login, logout, can(...perms), canAny(...perms), hasRole([...])`

**`can('permiso')`** → true si el usuario tiene ese permiso (o `system.full_access`).

### Convención de servicios frontend
```js
// modules/<modulo>/services/xService.js — específico del módulo
static async getEntidad(id) {
    const res = await axiosInstance.get(`/entidad/${id}`);
    return res.data.data;   // retorna el payload directo
}

// shared/services/xService.js — reutilizable entre módulos
```

### Manejo de errores (obligatorio)
```js
// En catch SIEMPRE usar handleAxiosError:
import { handleAxiosError } from '../../../shared/utils/errorHandler';
catch (err) {
    const msg = handleAxiosError(err);
    toast.error(msg);
}

// En try, usar el mensaje del backend:
const data = await MiService.accion();
toast.success(data.message || 'Fallback');
```

### Rutas y guards principales (`App.jsx`)
- `CompanysGate` → si `can('company.manage_all')` → `ListCompany`, si `can('company.manage_own')` → `ListCompany`, si solo `facility.manage_own` → redirect a `/subsidiary/:id`
- `resolveCompanysItem(item, can, companyIds)` → construye path del sidebar según permisos

### Variables de entorno admin
```
VITE_API_URL=http://localhost:5010/api
VITE_APP_NAME=Booking Sport Administrator
VITE_MAX_FILE_SIZE=5242880
```

---

## Portal Usuario (`FRONTEND_BOOKING/`)

### Stack
Igual que admin (React + Vite + Axios).

### Módulos
```
src/modules/
├── auth/           Login, registro, Google OAuth
├── reservations/   Flujo de reserva (selección espacio → fecha → hora → pago)
├── space_sports/   Exploración de canchas públicas
└── users/          Perfil, historial de reservas
```

### Variables de entorno portal
```
VITE_API_URL=http://localhost:5010/api
VITE_GOOGLE_CLIENT_ID=...
VITE_STRIPE_PUBLIC_KEY=pk_test_...
```

---

## Decisiones de arquitectura importantes

### 1. Permisos: base de datos, no en el JWT (pendiente)
Actualmente los permisos viajan en el JWT (token de 24h) — cambios no reflejan hasta re-login.
Pendiente: cachear permisos en Redis con TTL corto (60s) y consultarlos en `verificarPermiso.js`.

### 2. Imágenes (uploads)
- El backend sirve `/uploads` con header `Cross-Origin-Resource-Policy: cross-origin` para evitar `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`
- Usar `getImageUrl(path)` del frontend para construir la URL completa

### 3. Filtro de empresas basado en permisos
- `company.manage_all` → sin filtro `company_ids` → ve todas las empresas
- `company.manage_own` → filtrado por `company_ids[]` del JWT
- Corregido en: `extractUserContext.js` (`isManageAll`), `CompanyService.getAllCompanies`, `getMainCompanyForAdmin`, `getSubsidiaryForAdmin`, `verificarScope.js`

### 4. Multi-empresa super_admin
- Un super_admin puede ser propietario de empresas en distintos tenants
- `getUserCompanyAccess` expande subsidiarias de TODOS los tenants del usuario
- El acceso a detalles de empresa/sucursal usa `company_ids[]` (no `tenant_id`) como control

### 5. CSS en frontends
- Todos los estilos van en carpeta `styles/` del módulo, en archivos `.css` separados del JSX
- Usar CSS nesting anidado para evitar colisiones entre componentes
- No usar BEM shorthand `&__elemento` dentro de nesting (falla en algunos contextos); usar clases planas

### 6. Stripe (estado actual)
- Existe `StripeService.js` con `createPaymentIntent`, `verifyPaymentIntent`, `constructWebhookEvent`, `refund`
- `CardOnlinePaymentStrategy.js` usa una sola cuenta Stripe (plataforma)
- **Pendiente Stripe Connect**: ver `STRIPE_CONNECT_GUIDE.md`

---

## Flujos clave a recordar

### Flujo de reserva (usuario final → backend)
```
Frontend (portal) selecciona espacio + fecha + hora
  → POST /bookings/payment-intent (si pago con tarjeta) → client_secret
  → Stripe.js confirma pago
  → POST /bookings (con payment_intent_id o datos de otro método)
    → BookingService.processBooking()
      → Verifica solapamiento (SELECT FOR UPDATE)
      → Obtiene tenant_id desde Configuration de la sucursal
      → PaymentStrategyFactory.resolve(code).process()
      → Crea Booking + PaymentBooking
      → Emite eventos Socket.io
```

### Flujo de login admin
```
POST /users/admin-login
  → UserService.loginAdmin()
    → getUserPermissions(userId) → UserPermission table
    → getUserCompanyAccess(userId) → UserCompany + expandir sucursales
    → buildAdminToken(user, permissions, company_ids, tenant_id)
  → Responde con { token, user, role, permissions, company_ids, tenant_id }
```

### Flujo de configuración de pagos por sucursal (admin)
```
Admin selecciona sucursal en el ReactFlow (PaymentMethodsFlow)
  → se carga GET /catalogs/payment-types/country/:countryId (país de la sucursal)
  → Admin conecta métodos → POST /companies/payments-active
    → PaymentConfigurationService.saveActivePayments()
      → Upsert ConfigurationPayment
      → Cascade delete de PaymentAccounts removidos
  → Para cada método, admin configura cuentas (Yape, banco, etc.) en AccountsPanel
    → CRUD /companies/payment-accounts/...
```

---

## Endpoints principales del backend

| Endpoint | Protección | Descripción |
|----------|-----------|-------------|
| `POST /api/users/admin-login` | público | Login admin |
| `GET /api/companies` | `company.manage_own` | Lista empresas (filtrado por scope) |
| `GET /api/companies/details/:id` | auth | Detalle empresa/sucursal |
| `GET /api/catalogs/payment-types` | público | Todos los tipos de pago |
| `GET /api/catalogs/payment-types/country/:countryId` | público | Tipos de pago por país |
| `POST /api/bookings` | auth | Crear reserva |
| `POST /api/bookings/payment-intent` | auth | Crear Stripe PaymentIntent |
| `POST /api/bookings/webhooks/stripe` | público (firma) | Webhook Stripe |
| `GET /api/bookings/by-space` | auth | Reservas por espacio y fecha |
| `GET /api/bookings/range` | auth | Reservas en rango de fechas |
| `PUT /api/bookings/:id/approve` | `booking.confirm` | Confirmar reserva |
| `POST /api/users/assign-owner` | `company.manage_own` | Asignar super_admin a empresa |
| `GET /api/users` | auth | Lista usuarios |

---

## Lo que está pendiente de implementar

- [ ] Stripe Connect Express (ver `STRIPE_CONNECT_GUIDE.md`)
- [ ] Caché de permisos en Redis (TTL 60s) en `verificarPermiso.js` para que cambios de permisos reflejen sin re-login
- [ ] Carga de tipos de pago por país al seleccionar sucursal en `PaymentMethodsFlow`
- [ ] `AccountsPanel` para `CARD_ONLINE`: no mostrar formulario bancario, mostrar estado Stripe
