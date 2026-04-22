# Booking Sport - Documentación General del Sistema

Bienvenido a la documentación central del proyecto **Booking Sport**. Este documento está diseñado para proveer a todo el equipo de desarrollo con un entendimiento profundo y completo de la arquitectura del sistema, los flujos de datos, las relaciones y las responsabilidades de cada capa.

## 1. Visión General del Sistema

**Booking Sport** es un SaaS multi-tenant diseñado para la gestión y reserva de espacios deportivos. El sistema permite a empresas y sus respectivas sucursales administrar sus instalaciones, mientras que los usuarios finales pueden descubrir y reservar canchas.

El modelo de negocio se basa en una suscripción (mensual/anual) pagada por las empresas/sucursales, sin cobro de comisión por reserva.

### Componentes Principales

El sistema está dividido en tres proyectos principales:

1. **BACKEND_BOOKING**: API RESTful centralizada que maneja toda la lógica de negocio, acceso a datos y comunicaciones con servicios externos (Stripe, WebSockets).
2. **ADMINISTRATOR_BOOKING**: Aplicación Frontend (Panel de Control) dirigida a dueños de empresas, administradores y empleados de sucursales.
3. **FRONTEND_BOOKING**: Aplicación Frontend (Portal Público) dirigida a los clientes y usuarios finales para buscar y reservar espacios.

---

## 2. Arquitectura del Backend (`BACKEND_BOOKING`)

El backend está construido con **Node.js, Express, Sequelize (PostgreSQL) y Redis**, y sigue una estricta **arquitectura de capas modular**.

### 2.1. Arquitectura de Capas

Cada módulo dentro de `src/modules/` sigue el siguiente flujo de ejecución y responsabilidades:

`Request → Route (+DTO) → Controller → Handler → Service → Repository → DB`

*   **Route**: Define el método HTTP, la ruta y aplica middlewares (autenticación, validación de DTOs). No contiene lógica de negocio.
*   **Controller**: Recibe el `request`, extrae los datos necesarios (body, params, query, usuario autenticado) y llama al Handler.
*   **Handler**: Intermediario que ejecuta el Service correspondiente y formatea la respuesta de forma estandarizada usando `ApiResponse`.
*   **Service**: Contiene **toda la lógica de negocio**. Realiza cálculos, orquestaciones, verificaciones y lanza errores semánticos (ej. `NotFoundError`, `ConflictError`).
*   **Repository**: Es la **única capa que interactúa con la base de datos** (usando Sequelize). Centraliza las consultas, transacciones y agrupaciones de datos.

### 2.2. Módulos Principales (`src/modules/`)

*   **`users`**: Gestión de autenticación (JWT), usuarios, roles, permisos y asignación a empresas (`UserCompany`).
*   **`facility`**: Gestión de entidades base del negocio (Company, Space, BusinessHour, PaymentAccount, Configuration).
*   **`booking`**: Gestión de reservas (creación, holds, confirmación), estrategias de pago (Efectivo, Transferencia, Stripe) y webhooks.
*   **`catalogs`**: Tablas maestras estáticas (Países, Tipos de Deporte, Tipos de Superficie, Métodos de Pago por país).
*   **`reports` & `stadistics`**: Extracción de datos para tableros y analíticas.
*   **`media`**: Gestión de archivos y subidas (imágenes de canchas, logos).

### 2.3. Base de Datos y Modelos (Prefijo `dsg_bss_`)

La base de datos es **PostgreSQL**. Las tablas principales incluyen:
*   `User`, `UserPermission`, `UserCompany` (Gestión de Accesos).
*   `Company` (Empresa padre y sucursales - recursivo).
*   `Space` (Canchas deportivas).
*   `Booking`, `PaymentBooking`, `BookingHold` (Transacciones de reserva).

### 2.4. Control de Acceso (RBAC) y Multi-tenancy

El sistema no se basa en roles simples, sino en **permisos específicos** (`permissions[]`) y **alcance de empresa** (`company_ids[]`).
*   **Multi-tenant**: Los datos están aislados lógicamente por `tenant_id` y controlados por `company_ids` incluidos en el JWT.
*   **Middlewares Clave**:
    *   `protegerPermiso`: Verifica si el usuario tiene el token válido y un permiso específico.
    *   `protegerPermisoConScope`: Verifica token, permiso y además se asegura de que la entidad consultada pertenezca a un `company_id` al que el usuario tiene acceso.

---

## 3. Arquitectura de los Frontends

Ambos frontends (`ADMINISTRATOR_BOOKING` y `FRONTEND_BOOKING`) utilizan **React, Vite, React Router DOM y Axios**.

### 3.1. Estructura de Directorios

La estructura es modular, reflejando el backend:
*   `src/modules/`: Contiene módulos funcionales (ej. `auth`, `bookings`, `facilities`). Cada uno agrupa sus componentes, hooks, servicios y vistas/páginas específicas.
*   `src/shared/`: Contiene elementos reutilizables globalmente en toda la aplicación (Componentes UI genéricos, hooks como `usePermission`, utilidades como `axiosInstance`).

### 3.2. ADMINISTRATOR_BOOKING (Panel Admin)

*   **Responsabilidad**: Permite a los administradores gestionar su configuración, canchas, empleados, horarios y ver reservas.
*   **Gestión de Estado y Auth**: Usa un `AuthContext` que mantiene el JWT, la lista de permisos y `company_ids`.
*   **Guards**: Rutas protegidas que evalúan `can('permiso')` para permitir o denegar el acceso a ciertas pantallas.

### 3.3. FRONTEND_BOOKING (Portal Cliente)

*   **Responsabilidad**: Portal de cara al público para descubrir sucursales, ver disponibilidad de canchas y completar el flujo de reserva (incluyendo pagos online).
*   **Flujo de Reserva**: Selección de espacio → Selección de fecha/hora → Retención (Hold) → Pago (Stripe/Efectivo) → Confirmación.

---

## 4. Flujos Clave del Sistema

### 4.1. Flujo de Login y Permisos (Admin)
1. El frontend envía credenciales a `POST /users/admin-login`.
2. El `UserService` verifica las credenciales y consulta `UserPermission` y `UserCompany`.
3. Se genera un JWT que incluye `permissions[]` y `company_ids[]` (las sucursales a las que tiene acceso).
4. El frontend decodifica el token, lo guarda en el `AuthContext` y renderiza el sidebar/rutas basado en esos permisos.

### 4.2. Flujo de Reserva y Pagos
El sistema soporta múltiples estrategias de pago mediante el patrón *Strategy* (`PaymentStrategyFactory`):
1. El cliente selecciona espacio y horario. Se crea un **Hold** temporal (bloqueo en base de datos/Redis) para evitar colisiones.
2. Si el pago es online (Stripe), se llama a `POST /bookings/payment-intent` para obtener el `client_secret`.
3. El frontend de cliente procesa el pago de forma segura con Stripe.js.
4. Tras el éxito de Stripe, se envía `POST /bookings` para confirmar la reserva. La capa `BookingService` utiliza `CardOnlinePaymentStrategy` para crear la reserva final (`Booking` y `PaymentBooking`).
5. Se emite un evento vía **Socket.io** para actualizar en tiempo real el calendario del administrador.

---

## 5. Infraestructura y Servicios Externos

*   **Redis**: Utilizado para caché, invalidación de JWT (lista negra de tokens revocados tras logout) y optimización de consultas recurrentes.
*   **Socket.io**: Habilita notificaciones en tiempo real (ej. nuevas reservas entrando en la vista del administrador).
*   **Stripe**: Procesador de pagos para transacciones online. La arquitectura está preparada para escalar hacia *Stripe Connect* para pagos directos a las cuentas de las sucursales.

---

## 6. Convenciones y Buenas Prácticas del Equipo

1. **Uso de Shared Components**: Antes de crear un botón, modal o tabla en el frontend, verifica `src/shared/components`.
2. **Manejo de Errores Frontend**: Siempre usar el utilitario `handleAxiosError` en los bloques `catch` de las llamadas API.
3. **Manejo de Errores Backend**: Lanzar siempre CustomErrors (`NotFoundError`, `BadRequestError`) desde la capa Service; nunca enviar respuestas HTTP directas desde el Service. El `GlobalErrorHandler` se encargará de mapearlo a la respuesta correcta.
4. **Validación**: Todos los inputs del frontend deben tener contraparte de validación en el backend usando esquemas Joi (vía middleware `validateDTO`).
5. **No Bypasear Capas**: Nunca llamar a un Repository directamente desde un Controller. Siempre pasar por el Service.

---
*Documento mantenido por el equipo de ingeniería de Booking Sport.*