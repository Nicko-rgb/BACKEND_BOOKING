# Mejoras Pendientes — Backend Booking Sport

> Revisión de arquitectura orientada a escalabilidad y lanzamiento internacional.
> Ordenado por prioridad de impacto real en producción.

---

## Leyenda de estado

| Símbolo | Significado |
| -------- | ----------- |
| ❌       | Pendiente   |
| 🔄       | En progreso |
| ✅       | Completado  |

---

## 🔴 CRÍTICO — Resolver antes de salir a producción

### 1. ❌ Connection pooling en base de datos

**Archivo:** `src/config/db.js`
**Problema:** Sequelize usa el pool por defecto de 5 conexiones. Con 50+ usuarios concurrentes las queries empiezan a hacer cola y el servidor empieza a dar timeouts.

**Solución:**

```js
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    dialect: 'postgres',
    pool: {
        max: 20,       // máximo de conexiones activas
        min: 5,        // mínimo de conexiones abiertas
        acquire: 30000, // ms máximo esperando una conexión libre
        idle: 10000    // ms antes de liberar una conexión inactiva
    }
});
```

**Notas:** Ajustar `max` según el plan de la DB en producción (RDS, Supabase, etc. tienen límites por plan).

---

### 2. ❌ Helmet no está activo (security headers)

**Archivo:** `server.js`
**Problema:** `helmet` está instalado en `package.json` pero **nunca se registra como middleware**. Sin Helmet, el servidor no envía headers de seguridad críticos: `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security`.

**Solución:**

```js
const helmet = require('helmet');
app.use(helmet()); // agregar antes de las rutas
```

---

### 3. ❌ Rate limiting no está activo

**Archivo:** `server.js`
**Problema:** `express-rate-limit` está instalado en `package.json` pero **nunca se registra**. Los endpoints de login, registro y creación de reservas están expuestos a fuerza bruta sin ningún límite.

**Solución — aplicar por tipo de endpoint:**

```js
const rateLimit = require('express-rate-limit');

// Límite general para toda la API
const generalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });

// Límite estricto para autenticación
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Demasiados intentos, intenta en 15 minutos'
});

app.use('/api/', generalLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);
```

---

### 4. ❌ Sin logging estructurado

**Archivo:** todos los módulos
**Problema:** Solo se usa `console.log` / `console.error`. En producción no hay forma de correlacionar errores entre requests, no hay niveles de log, no hay forma de enviar logs a un servicio externo.

**Solución — implementar Winston o Pino:**

```js
// src/config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        // en producción agregar transporte a archivo o servicio externo
    ]
});
```

**Agregar request ID middleware** para correlacionar logs de un mismo request:

```js
const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
    req.id = uuidv4();
    res.setHeader('X-Request-Id', req.id);
    next();
});
```

---

### 5. ❌ Socket.IO sin adaptador Redis (no escala horizontalmente)

**Archivo:** `src/config/socketConfig.js`
**Problema:** Si se corren 2 o más instancias del servidor (load balancer), los eventos de Socket.IO solo llegan a los clientes conectados a esa instancia específica. Los eventos de disponibilidad de reservas (`booking:hold_created`, `booking:released`) no se propagan entre instancias.

**Solución:**

```js
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));
```

**Dependencia a instalar:** `@socket.io/redis-adapter`

---

### 6. ❌ Sin SSL configurado en la conexión a la DB

**Archivo:** `src/config/db.js`
**Problema:** La conexión a PostgreSQL no tiene SSL configurado. En producción (RDS, Supabase, Railway, etc.) la conexión debería ir cifrada.

**Solución:**

```js
dialectOptions: {
    ssl: process.env.NODE_ENV === 'production'
        ? { require: true, rejectUnauthorized: false }
        : false
}
```

---

## 🟠 ALTO — Resolver antes de escalar

### 7. ❌ Race condition (TOCTOU) en creación de reservas

**Archivo:** `src/modules/booking/repository/BookingRepository.js`, `src/modules/booking/services/BookingService.js`
**Problema:** El `checkOverlap()` ejecuta un `SELECT COUNT()` **fuera de la transacción**. Dos requests simultáneos para el mismo slot pueden pasar el check al mismo tiempo. La DB constraint los atrapa, pero el usuario recibe un error genérico en lugar de un mensaje claro.

```
Request A: checkOverlap() → libre ✓
Request B: checkOverlap() → libre ✓   ← ambos pasan
Request A: INSERT booking → OK
Request B: INSERT booking → ❌ UniqueConstraintError (UX mala)
```

**Solución — mover el overlap check dentro de la transacción con SELECT FOR UPDATE:**

```js
const existingHold = await BookingHold.findOne({
    where: { space_id, booking_date, start_time, end_time, status: 'ACTIVE' },
    lock: transaction.LOCK.UPDATE, // SELECT FOR UPDATE
    transaction
});
if (existingHold) throw new ConflictError('El slot ya está reservado');
```

---

### 8. ❌ Job de expiración no es cluster-aware

**Archivo:** `src/modules/booking/jobs/expirationJob.js`
**Problema:** El `setInterval` corre en cada instancia del servidor. Con 2 servidores activos, el mismo hold se procesaría dos veces, generando eventos de Socket.IO duplicados y posibles errores de estado.

**Solución — distributed lock con Redis:**

```js
const acquireLock = async (lockKey, ttlMs) => {
    const result = await redis.set(lockKey, '1', { NX: true, PX: ttlMs });
    return result === 'OK';
};

const processExpiredHolds = async () => {
    const lockAcquired = await acquireLock('lock:expiration_job', 14000); // 14s < 15s interval
    if (!lockAcquired) return; // otra instancia ya lo está procesando
    // ... lógica actual de expiración
};
```

---

### 9. ❌ Sin revocación de JWT (logout incompleto)

**Archivo:** `src/shared/middlewares/verificarTokenAuth.js`
**Problema:** El logout actual solo borra el token en el frontend. El token sigue siendo válido en el backend hasta que expira (24h). Si un token es comprometido, no hay forma de invalidarlo.

**Solución — blacklist de tokens en Redis:**

```js
// Al hacer logout:
const decoded = jwt.decode(token);
const ttlRestante = decoded.exp - Math.floor(Date.now() / 1000);
await redis.set(`blacklist:${decoded.jti}`, '1', { EX: ttlRestante });

// En verificarTokenAuth:
const isBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
if (isBlacklisted) throw new UnauthorizedError('Token revocado');
```

**Requiere:** agregar `jti` (JWT ID único) al payload al generar tokens.

---

### 10. ❌ Sin mecanismo de token refresh

**Archivo:** `src/modules/users/services/UserService.js` (auth)
**Problema:** Solo existe access token con 24h de vida. Sin refresh token, el usuario tiene dos opciones malas: token muy corto (re-login constante) o token largo (riesgo de seguridad).

**Solución — implementar refresh token:**

- Access token: 15 minutos de vida
- Refresh token: 7 días, almacenado en cookie `httpOnly`
- Endpoint `POST /api/users/refresh` para renovar el access token

---

### 11. ❌ Índices de DB incompletos en bookings

**Archivos:** modelos de `Booking` y `BookingHold`
**Problema:** Faltan índices compuestos para las queries de overlap y búsquedas frecuentes.

**Índices a agregar:**

```js
// En Booking model — para búsquedas de disponibilidad
{ fields: ['space_id', 'booking_date', 'start_time', 'end_time', 'status'] }

// En Booking model — para lookups de pago
{ fields: ['payment_id'] }

// En BookingHold — para limpieza de expirados
{ fields: ['expires_at', 'status'] }
```

---

### 12. ❌ Redis subutilizado

**Problema:** La infraestructura de Redis está lista pero casi no se usa para caching. Las consultas de catálogos (países, deportes, tipos de pago) y configuraciones de empresa se ejecutan en DB en cada request.

**Candidatos a cachear:**

| Dato                           | TTL sugerido |
| ------------------------------ | ------------ |
| Catálogos (países, deportes) | 1 hora       |
| Configuración de empresa      | 10 minutos   |
| Permisos de usuario por rol    | 5 minutos    |
| Disponibilidad de espacios     | 30 segundos  |

---

## 🟡 MEDIO — Excelencia operacional

### 13. ❌ Sin error tracking (Sentry o similar)

**Problema:** Los errores en producción solo se loggean en consola. Sin un sistema de tracking no hay alertas, no hay stack traces centralizados, no hay frecuencia de errores.

**Solución:** Integrar Sentry:

```js
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
app.use(Sentry.Handlers.requestHandler());
// ... rutas ...
app.use(Sentry.Handlers.errorHandler()); // antes del GlobalErrorHandler
```

---

### 14. ❌ Flags peligrosos en variables de entorno

**Archivo:** `.env`
**Problema:** `DB_FORCE_SYNC=true` y `DB_ALTER_SYNC=true` corren en cada inicio si están activos. En producción un `force: true` **borra todas las tablas**.

**Solución:**

- Nunca setear estos flags en producción
- Agregar guard en el código:

```js
if (process.env.NODE_ENV === 'production' && forceSync) {
    throw new Error('DB_FORCE_SYNC no puede estar activo en producción');
}
```

---

### 15. ❌ Sin suite de tests

**Problema:** No existe ningún archivo de test (unit, integration, e2e). Sin tests no hay red de seguridad para refactors ni para validar que el sistema de reservas funciona correctamente bajo condiciones de concurrencia.

**Prioridad de cobertura sugerida:**

1. `BookingService` — lógica de negocio más crítica
2. `checkOverlap` — casos borde de solapamiento de horarios
3. `expirationJob` — comportamiento de holds expirados
4. Endpoints de auth — login, refresh, logout

**Stack recomendado:** Jest + Supertest para integración con la DB de test.

---

### 16. ❌ Sin graceful shutdown completo

**Archivo:** `server.js`
**Problema:** El shutdown por SIGTERM/SIGINT cierra el servidor HTTP pero no espera a que las queries en vuelo terminen ni cierra las conexiones de DB y Redis correctamente.

**Solución:**

```js
process.on('SIGTERM', async () => {
    server.close(async () => {
        await sequelize.close();    // cerrar pool de DB
        await redisClient.quit();   // cerrar conexión Redis
        process.exit(0);
    });
});
```

---

### 17. ❌ Sin documentación de API (OpenAPI/Swagger)

**Problema:** No hay documentación de los endpoints disponibles, parámetros esperados, ni respuestas. Esto dificulta la integración del frontend y la incorporación de nuevos desarrolladores.

**Solución:** Integrar `swagger-jsdoc` + `swagger-ui-express` o generar spec OpenAPI desde los DTOs de Joi existentes.

---

## 📋 Checklist de progreso

### Crítico

- [X] Connection pooling en DB (`src/config/db.js`)
- [X] Activar Helmet en `server.js`
- [X] Activar Rate limiting en `server.js`
- [X] Implementar logging estructurado (Winston) — `src/config/logger.js`
- [X] Redis adapter para Socket.IO — `src/config/socketConfig.js`
- [X] SSL en conexión a DB (producción) — `src/config/db.js`

### Alto

- [X] SELECT FOR UPDATE en overlap de bookings — `BookingRepository.checkOverlap()` + `BookingService`
- [X] Distributed lock en expiration job — `redisConfig.setNX()` + `expirationJob.js`
- [X] Blacklist JWT para revocación al logout — `UserService.logoutUser()` + `verificarTokenAuth.js` + `POST /logout`
- [ ] Refresh token mechanism — access token 15min + refresh token 7 días en cookie httpOnly
- [X] Índice `payment_id` en modelo Booking — `src/modules/booking/models/Booking.js`
- [X] Caching con Redis para catálogos — todos los `*CatalogService.js`

### Medio

- [X] Integrar Sentry (error tracking) — `server.js` + `GlobalErrorHandler.js` (requiere `SENTRY_DSN` en .env)
- [X] Guard contra `DB_FORCE_SYNC` en producción — `server.js inicializarBaseDatos()`
- [X] Graceful shutdown completo — `server.js gracefulShutdown()` (cierra DB + Redis + timeout 15s)

### Arquitectura

- [X] **Migración RBAC → permisos directos** — eliminadas tablas `dsg_bss_roles`, `dsg_bss_user_roles`, `dsg_bss_role_permissions`. Campo `role VARCHAR(50)` en User y UserCompany como clasificador de display. Todos los accesos evaluados por `dsg_bss_user_permissions`.

### Pendiente (no bloqueante para lanzamiento) - NO IMPLEMENTAR AHORA

- [ ] **Suite de tests** (Jest + Supertest) — pruebas unitarias e integración para `BookingService`, `checkOverlap` y endpoints de auth. No bloquea el lanzamiento pero reduce el riesgo de bugs en producción al crecer el equipo o la codebase.
- [ ] **Refresh token mechanism** — access token 15min + refresh token 7 días en cookie httpOnly
