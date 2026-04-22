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

### 2. Crear la base de datos

En PostgreSQL, crea la base de datos:

```sql
CREATE DATABASE db_sport;
```

### 3. Instalar dependencias

```bash
npm install
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

Comandos disponibles en el CLI:

```bash
npm run migrate           # Ejecuta migraciones pendientes
npm run migrate:status    # Ver estado actual
npm run migrate:rollback  # Revertir último batch de migración
npm run migrate:create    # Generar un nuevo archivo de migración
npm run seed              # Corre seeders pendientes (Datos maestros y usuarios super admin)
npm run seed:status       # Ver estado de los seeders
npm run db:setup          # Corre migrate + seed secuencialmente
npm run db:reset          # (Cuidado) Elimina todo, migra y llena de nuevo (solo en desarrollo)
```

Para arquitectura completa inter-aplicación ver: `README_APP.md` en la raíz del proyecto.