# Booking Sport - Server

Servidor backend para la aplicación de reservas deportivas con autenticación de usuarios.

## Configuración Inicial

### 1. Crear archivo .env

Crea un archivo `.env` en la raíz del servidor con la siguiente configuración:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=db_sport
DB_USER=postgres
DB_PASSWORD=

# Server Configuration
PORT=5010
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES=24h

# Redis & Stripe (ver .env.example)
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear la base de datos, migrar y sembrar datos

```bash
# Crea la BD automáticamente si no existe, ejecuta migraciones y seeders
npm run db:create
```

### 4. Iniciar el servidor

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## Estructura de Carpetas y Arquitectura

El servidor sigue una **arquitectura de capas estricta** para separar responsabilidades y facilitar el mantenimiento. 

```text
src/
├── config/             # Archivos de inicialización y configuración de infraestructura:
│   ├── db.js           # Conexión a PostgreSQL vía Sequelize.
│   ├── logger.js       # Configuración de Winston/Morgan para logs.
│   ├── redisConfig.js  # Cliente de Redis.
│   └── socketConfig.js # Configuración e inicialización de Socket.io.
├── modules/            # Módulos de dominio (Cada uno encapsula su Route -> Controller -> Handler -> Service -> Repository):
│   ├── booking/        # Lógica de creación de reservas, holds, estrategias de pago (Efectivo/Stripe) y webhooks.
│   ├── catalogs/       # Datos estáticos o maestros: Países, Tipos de Deporte, Superficies, Tipos de pago.
│   ├── facility/       # Entidades base: Empresas (Company), Sucursales, Espacios (Canchas), Horarios, Cuentas de cobro.
│   ├── media/          # Gestión de carga de archivos, imágenes estáticas y logos.
│   ├── notification/   # Lógica para envío de correos, SMS o notificaciones push (si aplica).
│   ├── reports/        # Consultas complejas para proveer datos a los dashboards del Admin.
│   └── users/          # Autenticación, asignación de usuarios a empresas (UserCompany) y validación de permisos.
├── shared/             # Utilidades, middlewares y clases que abarcan a toda la aplicación:
│   ├── errors/         # Clases de Error Personalizadas (NotFoundError, ValidationError, etc.).
│   ├── handlers/       # Envoltorios globales (GlobalErrorHandler para atrapar excepciones sin 'try/catch' repetitivos).
│   ├── middlewares/    # Interceptores de request: proteger rutas por permisos, validación de schemas (Joi), y extracción de JWT.
│   └── utils/          # Clases helper (ApiResponse para formato uniforme, cacheUtility para interactuar con Redis).
└── server.js           # Punto de entrada de la aplicación. Configura middlewares globales de Express y monta las rutas base.
```

## Características

- ✅ Autenticación JWT y roles basados en permisos granulares
- ✅ Encriptación de contraseñas con bcrypt
- ✅ Validación de datos con Sequelize (DB) y Joi (DTOs en capa HTTP)
- ✅ Middleware de seguridad (Helmet, Rate Limiting)
- ✅ CORS configurado para ambos frontends
- ✅ Manejo de errores global mediante Clases de Error semánticas
- ✅ Integración con Redis para cache y sesiones (blacklist)
- ✅ WebSockets (Socket.io) para estado en tiempo real
- ✅ Patrón Strategy para soportar múltiples métodos de pago

## Respuestas de la API

Todas las respuestas siguen el patrón estructurado en `ApiResponse`:

```javascript
// Respuesta exitosa
{
    "success": true,
    "data": [ ... ],
    "message": "Operación exitosa",
    "timestamp": "2024-01-15T10:30:00Z"
}

// Respuesta de error
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Datos inválidos",
        "details": { ... }
    },
    "message": "Error de operación",
    "timestamp": "2024-01-15T10:30:00Z" 
}
```

## MIGRACIONES Y SEEDERS

El sistema de migraciones es por módulo. Cada módulo (`catalogs`, `users`, `media`, `facility`, `booking`, `notification`) tiene su propia carpeta `database/migrations/` y `database/seeders/`. El runner los ejecuta en orden de dependencia definido en `scripts/moduleOrder.js`.

### Comandos

```bash
# ── Migraciones ────────────────────────────────────────────────
npm run migrate              # Ejecuta migraciones pendientes
npm run migrate:status       # Lista todas las migraciones con su estado (Applied / Pending)
npm run migrate:rollback     # Revierte el último batch  [BLOQUEADO en producción]
npm run migrate:rollback -- --batch=3   # Revierte un batch específico

# Generar archivo de migración con boilerplate:
npm run migrate:create <modulo> <nombre>
# Ejemplo: npm run migrate:create booking add_recurring_fields
# Genera:  src/modules/booking/database/migrations/YYYYMMDD_NNN_add_recurring_fields.js

# ── Seeders ────────────────────────────────────────────────────
npm run seed                 # Ejecuta seeders pendientes (usa runOnce — no re-ejecuta)
npm run seed:status          # Lista todos los seeders con su estado

# ── Utilidades ─────────────────────────────────────────────────
npm run db:create            # Crea la BD si no existe → migrate → seed  (onboarding completo)
npm run db:setup             # migrate → seed  (BD ya existente)
npm run db:reset             # Elimina TODO → migrate → seed  [BLOQUEADO en producción]
npm run db:reset -- --force  # Igual pero sin confirmación interactiva
npm run db:help              # Muestra esta referencia en consola
```

### Reglas de producción

| Comando | Producción |
|---------|-----------|
| `migrate` | ✅ Seguro — solo aplica pendientes |
| `migrate:status` | ✅ Solo lectura |
| `migrate:create` | ✅ Solo crea archivo local |
| `seed` / `seed:status` | ✅ Seguros — idempotentes |
| `db:create` / `db:setup` | ✅ Seguros — idempotentes |
| `migrate:rollback` | ❌ Bloqueado |
| `db:reset` | ❌ Bloqueado |

> En producción nunca revertir migraciones. Para deshacer un cambio, crear una nueva migración forward.

Para arquitectura completa inter-aplicación ver: `README_APP.md` en la raíz del proyecto.