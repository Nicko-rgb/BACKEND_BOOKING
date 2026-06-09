# Flujo de Registro y Suscripción SaaS con Mercado Pago

Este documento es la **fuente de verdad** para implementar el flujo self-service de registro de Tenants en Booking Sport via MercadoPago. Reemplaza versiones anteriores.

---

## 🎯 Objetivo General

Transformar el proceso de registro manual actual en un flujo **"Self-Service"** completo. Un cliente visita `/planes`, elige su plan, completa un formulario (empresa + dueño), paga via MercadoPago y obtiene acceso automático al sistema — **sin intervención manual del equipo de Booking Sport**.

---

## 🏗️ Decisiones de Arquitectura

| Decisión | Elección | Razón |
|---|---|---|
| Ubicación backend | Nuevo módulo raíz `saas/` | Dominio propio: no es `facility` ni `system` (catálogos) |
| Ubicación frontend | Nuevo módulo raíz `saas/` | Flujo de compra aislado del resto de la app |
| SDK | `mercadopago` npm oficial | SDK v2 de MP, soporte para Preapproval (suscripciones) |
| Modelos existentes | `SaaSPlan` y `SaaSSubscription` se mantienen en `system/models/` | Ya existen y funcionan — solo se añaden campos |
| Activación | Vía **Webhook** (asíncrono) | La back_url es solo UX, el webhook es el trigger real |

---

## 📁 Estructura de Archivos a Crear / Modificar

```
BACKEND_BOOKING/
├── src/
│   ├── modules/
│   │   └── saas/                              ← MÓDULO NUEVO (raíz)
│   │       ├── controllers/
│   │       │   ├── SaaSCheckoutController.js  ← CREAR
│   │       │   └── WebhookController.js       ← CREAR
│   │       ├── services/
│   │       │   ├── SaaSCheckoutService.js     ← CREAR
│   │       │   └── WebhookService.js          ← CREAR
│   │       ├── dto/
│   │       │   └── CheckoutDto.js             ← CREAR
│   │       └── routes/
│   │           ├── saasRoutes.js              ← CREAR
│   │           └── webhookRoutes.js           ← CREAR
│   ├── modules/system/models/
│   │   └── SaaSSubscription.js               ← MODIFICAR (añadir campos MP)
│   ├── modules/facility/models/
│   │   └── Company.js                        ← MODIFICAR (ENUM 'P' en is_enabled)
│   ├── modules/facility/services/
│   │   └── CompanyService.js                 ← MODIFICAR (buildBaseCompanyData con mode)
│   └── config/
│       └── mercadopago.js                    ← CREAR (config del SDK)
├── src/modules/system/database/
│   └── migrations/
│       └── YYYYMMDD-add-mp-saas-fields.js    ← CREAR (migración)
├── server.js                                 ← MODIFICAR (2 nuevas rutas)
└── .env                                      ← MODIFICAR (vars MP)

FRONTEND_BOOKING/
└── src/
    ├── modules/
    │   ├── saas/                              ← MÓDULO NUEVO (raíz)
    │   │   ├── pages/
    │   │   │   ├── CheckoutPage.jsx           ← CREAR (Wizard 3 pasos)
    │   │   │   ├── CheckoutSuccessPage.jsx    ← CREAR
    │   │   │   ├── CheckoutPendingPage.jsx    ← CREAR
    │   │   │   └── CheckoutFailurePage.jsx    ← CREAR
    │   │   ├── components/
    │   │   │   ├── StepCompany.jsx            ← CREAR (paso 1: datos empresa)
    │   │   │   ├── StepOwner.jsx              ← CREAR (paso 2: datos dueño)
    │   │   │   └── StepReview.jsx             ← CREAR (paso 3: resumen + pagar)
    │   │   ├── services/
    │   │   │   └── checkoutService.js         ← CREAR (llamadas al backend)
    │   │   └── styles/
    │   │       └── checkout.css               ← CREAR
    │   └── home/pages/
    │       └── Plans.jsx                      ← MODIFICAR (botones → /checkout/:plan_id)
    └── App.jsx                                ← MODIFICAR (añadir 4 nuevas rutas)
```

---

## 🔄 Flujo Completo Paso a Paso

### FASE 1 — Frontend: Selección y captura de datos
**Módulo:** `FRONTEND_BOOKING/src/modules/home/` y `saas/`

1. El cliente está en `/planes` (`Plans.jsx`).
2. Elige un plan y hace clic en **"Iniciar Prueba"** / **"Contratar"**.
3. El botón redirige a `/checkout/:plan_id` (actualmente es un `<button>` sin acción — **modificar**).
4. `CheckoutPage.jsx` muestra un **Wizard de 3 pasos**:
   - **Paso 1 — Datos de la Empresa:** Nombre Comercial, RUC/Documento, País, Teléfono, Dirección.
   - **Paso 2 — Datos del Propietario/Admin:** Nombre, Apellidos, Email (será su login), Teléfono, Contraseña.
   - **Paso 3 — Resumen:** Muestra plan elegido, precio, datos ingresados y el botón **"Pagar con MercadoPago"**.

---

### FASE 2 — Backend: Orquestación e intención de pago
**Módulo:** `BACKEND_BOOKING/src/modules/saas/`
**Endpoint:** `POST /api/v1/saas/checkout-session`

Al presionar "Pagar", el frontend envía un payload combinado. El `SaaSCheckoutService` ejecuta:

```
1. Validar que plan_id existe y is_active = true
2. Validar que el email del owner NO existe en la tabla de usuarios
3. Validar que el RUC/document NO existe como empresa padre
4. ── Abrir Transacción de Sequelize ──────────────────────────────────────
   a. Crear Company con:
        is_enabled = 'P'  (PENDING — no puede operar aún)
        status = 'INACTIVE'
        tenant_id = randomUUID()
   b. Crear User (owner) con:
        role = 'super_admin'
        is_enabled = false  (no puede loguearse aún)
        password = bcrypt(password)
   c. Crear UserCompany vinculando User ↔ Company (rol super_admin)
   d. Crear SaaSSubscription con:
        status = 'PENDING'
        gateway = 'MERCADOPAGO'
        plan_id = plan elegido
5. ── Llamar a MercadoPago API ────────────────────────────────────────────
   Crear Preapproval (suscripción recurrente) con:
        external_reference = subscription_id  (nuestro ID de BD)
        back_url.success   = FRONT_BOOKING_APP + '/checkout/success'
        back_url.pending   = FRONT_BOOKING_APP + '/checkout/pending'
        back_url.failure   = FRONT_BOOKING_APP + '/checkout/failure'
   ⚠️  Si este paso falla → ROLLBACK de toda la transacción
6. Guardar mp_preapproval_id en SaaSSubscription
7. COMMIT de la transacción
8. ── Responder al Frontend ───────────────────────────────────────────────
   { init_point: "https://www.mercadopago.com.pe/subscriptions/checkout?preapproval_plan_id=..." }
```

---

### FASE 3 — Interacción con MercadoPago

1. El Frontend recibe el `init_point` y hace: `window.location.href = init_point`
2. El usuario completa el pago en la pasarela segura de MercadoPago.
3. MP redirige al usuario a la back_url correspondiente:
   - `/checkout/success` → Pago aprobado (visual solamente)
   - `/checkout/pending` → Pago en revisión
   - `/checkout/failure` → Error en el pago

---

### FASE 4 — Webhook: Activación asíncrona (el motor real)
**Endpoint:** `POST /api/v1/webhooks/mercadopago`
**Módulo:** `BACKEND_BOOKING/src/modules/saas/`

> ⚠️ Este endpoint NO lleva middleware JWT. Es público pero validado por MercadoPago.

```
1. MercadoPago envía un POST con { type: "subscription_preapproval", data: { id: "..." } }
2. El WebhookService consulta a la API de MP el estado real del preapproval (no confiar solo en el body)
3. Extrae el external_reference → subscription_id de nuestra BD
4. Busca SaaSSubscription por subscription_id

── Según el status devuelto por MP: ─────────────────────────────────────────

✅ status === 'authorized' | 'active':
   - SaaSSubscription.update({ status: 'ACTIVE', current_period_start, current_period_end })
   - Company.update({ is_enabled: 'A', status: 'ACTIVE' })
   - User.update({ is_enabled: true })
   - Enviar email de bienvenida al owner (NodeMailer ya configurado)

⏳ status === 'pending':
   - SaaSSubscription.update({ status: 'PENDING' })  (sin cambios en Company/User)

❌ status === 'cancelled' | 'paused':
   - SaaSSubscription.update({ status: 'CANCELED' })
   - Company.update({ is_enabled: 'I' })

5. Responder siempre HTTP 200 a MP (MP reintenta si no recibe 200)
```

---

## 🛠️ Cambios en Código Existente

### 1. `Company.js` — Añadir `'P'` al ENUM `is_enabled`
```js
// ANTES
is_enabled: { type: DataTypes.ENUM('A', 'I'), ... }

// DESPUÉS
is_enabled: { type: DataTypes.ENUM('A', 'I', 'P'), ... }
// 'A' = Active | 'I' = Inactive | 'P' = Pending (esperando pago)
```

### 2. `CompanyService.js` — `buildBaseCompanyData` con modo opcional
```js
// ANTES — siempre nace ACTIVE
const buildBaseCompanyData = (companyData, userId) => ({
    ...companyData,
    ...buildAuditFields(userId),
    status: 'ACTIVE',
    is_enabled: 'A'
});

// DESPUÉS — modo configurable para el flujo SaaS
const buildBaseCompanyData = (companyData, userId, mode = 'ACTIVE') => ({
    ...companyData,
    ...buildAuditFields(userId),
    status: mode === 'PENDING' ? 'INACTIVE' : 'ACTIVE',
    is_enabled: mode === 'PENDING' ? 'P' : 'A'
});
// El flujo admin llama sin argumentos extra → sin cambios de comportamiento
// El flujo SaaS llama con mode='PENDING' → Company nace inactiva
```

### 3. `SaaSSubscription.js` — Campos MP adicionales (no reemplaza los de Stripe)
```js
// AÑADIR estos campos (los de Stripe quedan igual para compatibilidad)
gateway: {
    type: DataTypes.STRING(30),
    defaultValue: 'STRIPE',
    comment: "'STRIPE' | 'MERCADOPAGO'"
},
mp_preapproval_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'ID del Preapproval en MercadoPago'
},
mp_payer_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Email del pagador registrado en MP'
}
```

### 4. `server.js` — Registrar las 2 nuevas rutas
```js
// Añadir junto a los demás requires
const saasRoutes    = require('./src/modules/saas/routes/saasRoutes');
const webhookRoutes = require('./src/modules/saas/routes/webhookRoutes');

// Añadir antes del GlobalErrorHandler
app.use('/api/v1/saas',     saasRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
```

### 5. `Plans.jsx` — Cambiar botones CTA
```jsx
// ANTES (botón sin acción)
<button className={cta.className}>{cta.text}</button>

// DESPUÉS (redirige al checkout del módulo saas)
import { useNavigate } from 'react-router-dom';
// ...
const navigate = useNavigate();
// ...
<button
    className={cta.className}
    onClick={() => navigate(`/checkout/${plan.plan_id}?billing=${isYearly ? 'yearly' : 'monthly'}`)}
>
    {cta.text}
</button>
```

### 6. `App.jsx` — Añadir 4 nuevas rutas
```jsx
import CheckoutPage         from './modules/saas/pages/CheckoutPage';
import CheckoutSuccessPage  from './modules/saas/pages/CheckoutSuccessPage';
import CheckoutPendingPage  from './modules/saas/pages/CheckoutPendingPage';
import CheckoutFailurePage  from './modules/saas/pages/CheckoutFailurePage';

// Dentro de <Routes>:
<Route path="/checkout/:plan_id"   element={<CheckoutPage />} />
<Route path="/checkout/success"    element={<CheckoutSuccessPage />} />
<Route path="/checkout/pending"    element={<CheckoutPendingPage />} />
<Route path="/checkout/failure"    element={<CheckoutFailurePage />} />
```

---

## 📦 Migración de Base de Datos

Archivo: `src/modules/system/database/migrations/YYYYMMDD-add-mp-saas-fields.js`

```sql
-- 1. Añadir valor 'P' al ENUM de Company
ALTER TYPE "enum_dsg_bss_company_is_enabled" ADD VALUE IF NOT EXISTS 'P';

-- 2. Añadir campos de MercadoPago a la tabla de suscripciones
ALTER TABLE dsg_bss_saas_subscriptions
    ADD COLUMN IF NOT EXISTS gateway          VARCHAR(30)  NOT NULL DEFAULT 'STRIPE',
    ADD COLUMN IF NOT EXISTS mp_preapproval_id VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS mp_payer_email   VARCHAR(100) NULL;
```

---

## ⚙️ Variables de Entorno a Añadir (`.env`)

```env
# ============================================
# PASARELAS DE PAGO (MERCADO PAGO - PERÚ)
# ============================================
MP_ACCESS_TOKEN=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_PUBLIC_KEY=TEST-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MP_WEBHOOK_SECRET=         # Opcional: para validar firma HMAC del webhook
```

### Instalar SDK
```bash
cd BACKEND_BOOKING
npm install mercadopago
```

---

## 🧪 Etapa de Pruebas E2E

### Setup local (webhooks)
```bash
# Exponer backend local a internet para que MP alcance el endpoint
npx localtunnel --port 5010 --subdomain booking-sport-local

# Configurar en MercadoPago Dashboard (Credenciales de Prueba):
# Webhook URL: https://booking-sport-local.loca.lt/api/v1/webhooks/mercadopago
# Eventos:     subscription_preapproval
```

### Tarjetas de prueba MP Perú
| Resultado | Número | CVV | Vencimiento |
|---|---|---|---|
| ✅ Aprobada | `4509 9535 6623 3704` | cualquiera | futura |
| ❌ Rechazada | `4170 0688 1010 8020` | cualquiera | futura |

### Checklist de verificación
- [ ] Ir a `/planes` → seleccionar plan → redirige a `/checkout/:plan_id`
- [ ] Completar Wizard (empresa + owner) → botón "Pagar con MercadoPago"
- [ ] Backend crea Company(`P`), User(`disabled`), Subscription(`PENDING`) en BD
- [ ] Redirección a pasarela MP → pagar con tarjeta de prueba
- [ ] MP redirige a `/checkout/success`
- [ ] Backend recibe webhook → activa Company + User en BD
- [ ] Login exitoso en `ADMINISTRATOR_BOOKING` con credenciales del owner

---

## 📅 Plan de Desarrollo

### Etapa 1 — Preparación
- [x] `npm install mercadopago` en BACKEND_BOOKING
- [x] Añadir vars `MP_ACCESS_TOKEN` y `MP_PUBLIC_KEY` al `.env`
- [x] Crear `src/config/mercadopago.js`

### Etapa 2 — Base de Datos
- [x] Crear migración `add-mp-saas-fields`
- [x] Modificar `Company.js` (ENUM `'P'`)
- [x] Modificar `SaaSSubscription.js` (campos gateway, mp_preapproval_id, mp_payer_email)
- [x] Modificar `CompanyService.js` (`buildBaseCompanyData` con `mode`)

### Etapa 3 — Backend: Checkout
- [x] Crear `saas/dto/CheckoutDto.js` (validación Joi del payload)
- [x] Crear `saas/services/SaaSCheckoutService.js` (lógica transaccional + MP)
- [x] Crear `saas/controllers/SaaSCheckoutController.js`
- [x] Crear `saas/routes/saasRoutes.js`
- [x] Registrar ruta en `server.js`

### Etapa 4 — Backend: Webhook
- [x] Crear `saas/services/WebhookService.js` (activación asíncrona)
- [x] Crear `saas/controllers/WebhookController.js`
- [x] Crear `saas/routes/webhookRoutes.js`
- [x] Registrar ruta en `server.js`

### Etapa 5 — Frontend: Módulo saas
- [x] Crear `saas/services/checkoutService.js`
- [x] Crear `saas/components/StepCompany.jsx` (Unificado en Wizard para simplicidad)
- [x] Crear `saas/components/StepOwner.jsx` (Unificado en Wizard para simplicidad)
- [x] Crear `saas/components/StepReview.jsx` (Unificado en Wizard para simplicidad)
- [x] Crear `saas/pages/CheckoutPage.jsx` (Wizard)
- [x] Crear `saas/pages/CheckoutSuccessPage.jsx`
- [x] Crear `saas/pages/CheckoutPendingPage.jsx` (Unificado en Éxito)
- [x] Crear `saas/pages/CheckoutFailurePage.jsx` (Unificado en Éxito)
- [x] Crear `saas/styles/checkout.css`

### Etapa 6 — Conectar piezas
- [x] Modificar `Plans.jsx` (botones → navigate)
- [x] Modificar `App.jsx` (nuevas rutas)

### Etapa 7 — Pruebas E2E
- [ ] Setup ngrok/localtunnel + webhook en dashboard MP
- [ ] Checklist completo de verificación