# Guía de implementación: Stripe Connect para reservas

## Arquitectura elegida: Stripe Connect Express

```
Usuario paga reserva (60 soles)
        │
        ▼
  Stripe Platform
  (cuenta plataforma)
        │
        │  transfer_data.destination = stripe_account_id de la sucursal
        │  application_fee_amount = 0  (plataforma no cobra nada)
        │
        ▼
  Connected Account de la sucursal
  Recibe ~57.34 soles (Stripe descuenta su fee: ~3.6% + S/0.50)
        │
        ▼
  Payout automático a la cuenta bancaria de la sucursal (cada X días)
```

**Express vs Standard:**
- **Express (recomendado)**: Stripe maneja el onboarding (KYC), dashboard simplificado para la sucursal
- Standard: La sucursal crea su propia cuenta Stripe completa (más control, más complejo)

---

## Comisiones de Stripe

| País | Fee por transacción | Ejemplo: S/ 60 |
|------|---------------------|----------------|
| Perú (PEN) | 3.6% + S/ 0.50 | Sucursal recibe S/ 57.34 |
| México (MXN) | 3.6% + MX$ 3.00 | Según monto |
| Colombia (COP) | 2.9% + COP$ 900 | Según monto |

> La plataforma cobra `application_fee_amount = 0`. La ganancia de la plataforma es la suscripción mensual/anual del sistema, no un porcentaje por transacción.

---

## Pasos de implementación

---

### FASE 1 — Configuración en Stripe Dashboard

1. Crear cuenta en [dashboard.stripe.com](https://dashboard.stripe.com)
2. Ir a **Settings → Connect → Settings** y configurar:
   - Tipo de cuenta conectada: **Express**
   - Agregar nombre de la plataforma, logo, colores
   - Configurar los países soportados
3. Obtener claves:
   - `STRIPE_SECRET_KEY` (ya existe en `.env`)
   - `STRIPE_PUBLISHABLE_KEY` (para el frontend)
   - `STRIPE_WEBHOOK_SECRET` (ya existe)
   - `STRIPE_CONNECT_CLIENT_ID` — **nuevo**, se obtiene en Settings → Connect

4. Instalar CLI de Stripe para testear webhooks localmente:
   ```bash
   stripe listen --forward-to localhost:5010/api/bookings/webhooks/stripe
   ```

---

### FASE 2 — Base de datos

#### 2.1 Nueva columna en `dsg_bss_configuration`

```sql
ALTER TABLE dsg_bss_configuration
  ADD COLUMN stripe_account_id     VARCHAR(100) NULL COMMENT 'Stripe Connect account ID (acct_xxx)',
  ADD COLUMN stripe_onboarding_done TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN stripe_charges_enabled TINYINT(1)  NOT NULL DEFAULT 0,
  ADD COLUMN stripe_payouts_enabled TINYINT(1)  NOT NULL DEFAULT 0;
```

> **¿Por qué en Configuration?** Cada sucursal ya tiene una fila en `dsg_bss_configuration`. El `stripe_account_id` es una configuración de la sucursal, no del tipo de pago.

#### 2.2 Verificar que existen PaymentTypes con `code = 'CARD_ONLINE'` por país

```sql
-- Verificar
SELECT * FROM dsg_bss_payment_types WHERE code = 'CARD_ONLINE';

-- Si no existe, insertar para cada país operativo (ejemplo Perú, country_id según tu tabla)
INSERT INTO dsg_bss_payment_types 
  (country_id, name, code, category, provider, commission_percentage, fixed_commission, is_enabled, description)
VALUES
  (1, 'Tarjeta de crédito / débito', 'CARD_ONLINE', 'tarjeta_credito', 'Stripe', 0.0360, 0.50, true, 'Pagos con tarjeta procesados por Stripe');
-- Repetir para cada country_id que opere en la plataforma
```

---

### FASE 3 — Backend

#### 3.1 Actualizar modelo `Configuration.js`

**Archivo:** `BACKEND_BOOKING/src/modules/facility/models/Configuration.js`

Agregar los nuevos campos al modelo Sequelize:
```js
stripe_account_id:      { type: DataTypes.STRING(100), allowNull: true },
stripe_onboarding_done: { type: DataTypes.BOOLEAN, defaultValue: false },
stripe_charges_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
stripe_payouts_enabled: { type: DataTypes.BOOLEAN, defaultValue: false },
```

---

#### 3.2 Actualizar `StripeService.js`

**Archivo:** `BACKEND_BOOKING/src/modules/booking/services/StripeService.js`

Agregar métodos para Stripe Connect:

```js
/**
 * Crea un Stripe Connect Express Account para una sucursal.
 * @returns {string} accountId — ej: 'acct_1234'
 */
async createConnectedAccount(email, countryCode = 'PE') {
    const account = await this.stripe.accounts.create({
        type: 'express',
        country: countryCode,   // ISO 3166-1 alpha-2
        email,
        capabilities: {
            card_payments: { requested: true },
            transfers:     { requested: true },
        },
    });
    return account.id;
}

/**
 * Genera la URL de onboarding de Stripe para que la sucursal complete sus datos.
 * @param {string} accountId   — acct_xxx de la sucursal
 * @param {string} refreshUrl  — URL a la que Stripe redirige si el link expira
 * @param {string} returnUrl   — URL a la que Stripe redirige al completar
 */
async createOnboardingLink(accountId, refreshUrl, returnUrl) {
    const link = await this.stripe.accountLinks.create({
        account:     accountId,
        refresh_url: refreshUrl,
        return_url:  returnUrl,
        type:        'account_onboarding',
    });
    return link.url;
}

/**
 * Recupera el estado actual del connected account (charges_enabled, payouts_enabled).
 * @param {string} accountId
 */
async getConnectedAccountStatus(accountId) {
    const account = await this.stripe.accounts.retrieve(accountId);
    return {
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        details_submitted: account.details_submitted,
    };
}

/**
 * Crea un PaymentIntent con transfer_data para que el dinero vaya a la sucursal.
 * application_fee_amount = 0 porque la plataforma no cobra comisión.
 * @param {object} params
 * @param {number} params.amount        — Monto en unidad menor (centavos / céntimos)
 * @param {string} params.currency      — ISO 4217: 'pen', 'usd', 'mxn', etc.
 * @param {string} params.connectedAccountId — acct_xxx de la sucursal
 * @param {object} params.metadata
 */
async createPaymentIntentForSubsidiary({ amount, currency = 'pen', connectedAccountId, description, metadata }) {
    const params = {
        amount,
        currency,
        description,
        metadata,
        automatic_payment_methods: { enabled: true },
    };

    if (connectedAccountId) {
        // Transferencia directa al connected account; plataforma no cobra fee
        params.transfer_data = { destination: connectedAccountId };
    }

    const pi = await this.stripe.paymentIntents.create(params);
    return {
        clientSecret:    pi.client_secret,
        paymentIntentId: pi.id,
        amount:          pi.amount,
        currency:        pi.currency,
    };
}
```

---

#### 3.3 Nuevos endpoints de onboarding

**Archivo nuevo:** `BACKEND_BOOKING/src/modules/facility/routes/stripeRoutes.js`

```
POST /api/companies/:id/stripe/onboard  → inicia onboarding Express
GET  /api/companies/:id/stripe/status   → verifica estado del connected account
POST /api/companies/:id/stripe/refresh  → regenera link expirado
```

**Service** — `CompanyService.js` o nuevo `StripeOnboardingService.js`:
```js
// Flujo de onboarding
async initiateStripeOnboarding(sucursalId, requestingUser) {
    const config = await ConfigurationRepository.findBySucursalId(sucursalId);
    
    // Si ya tiene account_id, generar nuevo link de onboarding
    let accountId = config?.stripe_account_id;
    
    if (!accountId) {
        // Obtener email del propietario de la empresa
        const company = await CompanyRepository.findById(sucursalId);
        accountId = await StripeService.createConnectedAccount(
            company.email || 'noreply@platform.com',
            company.country?.iso_code || 'PE'
        );
        // Guardar account_id en Configuration
        await ConfigurationRepository.update(sucursalId, { stripe_account_id: accountId });
    }
    
    const baseUrl = process.env.FRONTEND_ADMIN_URL;
    const link = await StripeService.createOnboardingLink(
        accountId,
        `${baseUrl}/config/stripe/refresh/${sucursalId}`,
        `${baseUrl}/config/stripe/return/${sucursalId}`
    );
    
    return { onboarding_url: link, account_id: accountId };
}
```

---

#### 3.4 Modificar `CardOnlinePaymentStrategy.process()`

**Archivo:** `BACKEND_BOOKING/src/modules/booking/strategies/CardOnlinePaymentStrategy.js`

Actualmente usa `StripeService.createPaymentIntent()` (sin connected account).
Cambiar para usar el nuevo `createPaymentIntentForSubsidiary()`:

```js
// En process()
// Resolver el stripe_account_id de la sucursal
const { Configuration } = require('../../facility/models');
const sucursalConfig = await Configuration.findOne({ where: { company_id: sucursalId } });
const connectedAccountId = sucursalConfig?.stripe_account_id || null;

// Si la sucursal no tiene connected account aún, usar cuenta plataforma como fallback
const pi = await StripeService.verifyPaymentIntent(payment_intent_id, connectedAccountId);
```

> **Nota:** El `payment_intent_id` viene del frontend — el frontend ya creó el PaymentIntent con `/bookings/payment-intent`. Ese endpoint también debe recibir el `sucursal_id` para saber a qué connected account crear el PI.

---

#### 3.5 Modificar endpoint `POST /bookings/payment-intent`

**Archivo:** `BACKEND_BOOKING/src/modules/booking/controllers/bookingController.js`

```js
const createPaymentIntent = async (req, res) => {
    const { amount, currency, sucursal_id, metadata } = req.body;
    
    // Resolver connected account de la sucursal
    const config = await Configuration.findOne({ where: { company_id: sucursal_id } });
    const connectedAccountId = config?.stripe_account_id || null;
    
    const result = await StripeService.createPaymentIntentForSubsidiary({
        amount: Math.round(amount * 100),  // a centavos
        currency: currency || 'pen',
        connectedAccountId,
        metadata,
    });
    
    return ApiResponse.ok(res, result, 'Payment intent creado');
};
```

---

#### 3.6 Webhook: manejar eventos de connected accounts

**Archivo:** `BACKEND_BOOKING/src/modules/booking/controllers/bookingController.js` (stripeWebhook)

Agregar manejo del evento `account.updated` para actualizar el estado:

```js
case 'account.updated': {
    const account = event.data.object;
    await Configuration.update(
        {
            stripe_charges_enabled: account.charges_enabled,
            stripe_payouts_enabled: account.payouts_enabled,
            stripe_onboarding_done: account.details_submitted,
        },
        { where: { stripe_account_id: account.id } }
    );
    break;
}
```

---

### FASE 4 — Frontend Admin (panel de configuración de sucursal)

#### 4.1 Cargar métodos de pago por país de la sucursal

**Archivo:** `ADMINISTRATOR_BOOKING/src/shared/services/catalogService.js`

```js
static async getPaymentTypesByCountry(countryId) {
    const res = await axiosInstance.get(`/catalogs/payment-types/country/${countryId}`);
    return res.data.data || [];
}
```

**Archivo:** `ADMINISTRATOR_BOOKING/src/modules/facilities/hooks/useConfiguration.js`

Cuando cambia `selectedSubId`, cargar los tipos de pago del país de esa sucursal:
```js
useEffect(() => {
    if (!selectedSub) return;
    const countryId = selectedSub.country_id || company?.country_id;
    if (!countryId) return;
    catalogService.getPaymentTypesByCountry(countryId).then(types => {
        // actualizar estado local de paymentMethods para ese país
        setLocalPaymentMethods(types.map(t => ({ ... })));
    });
}, [selectedSubId]);
```

#### 4.2 Sección Stripe Connect en la configuración de la sucursal

En `ConfigCompany.jsx` o en una nueva sección del tab "Pagos", mostrar el estado Stripe de la sucursal seleccionada:

```
┌─────────────────────────────────────────────────────┐
│  💳 Pagos con tarjeta — Stripe                      │
│                                                     │
│  Estado: ⚠️ Sin configurar                          │
│  [Configurar cuenta Stripe →]                       │
│                                                     │
│  ─── O si ya tiene cuenta ──────────────────────── │
│  Estado: ✅ Activo                                  │
│  Cobros: ✅ Habilitados   Payouts: ✅ Habilitados   │
│  [Ir al Dashboard Stripe ↗]                        │
└─────────────────────────────────────────────────────┘
```

Al hacer click en "Configurar cuenta Stripe":
1. Llama a `POST /api/companies/:id/stripe/onboard`
2. Recibe `{ onboarding_url }` 
3. `window.open(onboarding_url, '_blank')` — Stripe abre en nueva pestaña
4. El dueño de la sucursal completa el formulario de Stripe (datos bancarios, KYC)
5. Stripe redirige a `return_url` al terminar
6. El frontend actualiza el estado consultando `GET /api/companies/:id/stripe/status`

#### 4.3 `AccountsPanel` para CARD_ONLINE

En `PaymentMethodsFlow.jsx`, cuando el método es `code === 'CARD_ONLINE'`:
- NO mostrar el formulario bancario (`AccountForm`)
- Mostrar el estado de Stripe Connect de la sucursal con el botón de onboarding

---

### FASE 5 — Frontend Portal de Reservas (FRONTEND_BOOKING)

El flujo Stripe.js ya existe pero usa un solo Payment Intent. Ajustar para pasar `sucursal_id`:

```js
// Al crear el payment intent (antes de que el cliente ingrese su tarjeta)
const { clientSecret } = await bookingService.createPaymentIntent({
    amount: totalAmount,
    currency: subsidiary.country.currency_code,  // 'pen', 'usd', etc.
    sucursal_id: subsidiary.sucursal_id,
});

// Confirmar con Stripe.js (sin cambios — solo usa el client_secret)
const { error } = await stripe.confirmPayment({
    elements,
    confirmParams: { return_url: `${window.location.origin}/booking/confirm` },
});
```

> El `currency_code` debería estar en el modelo `Country` o en la configuración de la sucursal.

---

### FASE 6 — Variables de entorno adicionales

```env
# .env del backend
STRIPE_SECRET_KEY=sk_live_...         # ya existe
STRIPE_WEBHOOK_SECRET=whsec_...       # ya existe
STRIPE_CONNECT_CLIENT_ID=ca_...       # NUEVO — de Stripe Dashboard > Connect > Settings

# .env del frontend admin
VITE_FRONTEND_ADMIN_URL=https://admin.tusistema.com   # para return_url de onboarding
```

---

## Orden de implementación recomendado

```
[ ] 1. Stripe Dashboard — crear cuenta, habilitar Connect Express, obtener STRIPE_CONNECT_CLIENT_ID
[ ] 2. BD — ALTER TABLE dsg_bss_configuration (stripe_account_id, etc.)
[ ] 3. BD — Insertar PaymentType CARD_ONLINE por cada país
[ ] 4. Backend — actualizar Configuration.js (modelo Sequelize)
[ ] 5. Backend — StripeService.js: añadir createConnectedAccount, createOnboardingLink, createPaymentIntentForSubsidiary
[ ] 6. Backend — nuevos endpoints de onboarding (route + handler + service)
[ ] 7. Backend — modificar CardOnlinePaymentStrategy para usar connected account
[ ] 8. Backend — modificar endpoint /payment-intent para resolver connected account
[ ] 9. Backend — webhook: manejar account.updated
[ ] 10. Frontend Admin — catalogService: añadir getPaymentTypesByCountry
[ ] 11. Frontend Admin — useConfiguration: cargar métodos por país al seleccionar sucursal
[ ] 12. Frontend Admin — PaymentMethodsFlow: sección Stripe Connect en lugar de AccountForm para CARD_ONLINE
[ ] 13. Frontend Portal — pasar sucursal_id al crear payment intent
[ ] 14. Pruebas end-to-end con cuenta Stripe en modo TEST
```

---

## Pruebas con Stripe en modo TEST

Stripe provee tarjetas de prueba:

| Tarjeta | Resultado |
|---------|-----------|
| `4242 4242 4242 4242` | Pago exitoso |
| `4000 0000 0000 9995` | Fondos insuficientes |
| `4000 0025 0000 3155` | Requiere autenticación 3D Secure |

Fecha: cualquier fecha futura. CVV: cualquier 3 dígitos.

Para probar webhooks localmente:
```bash
stripe listen --forward-to localhost:5010/api/bookings/webhooks/stripe
# Stripe CLI imprime un webhook secret temporal para usar en .env
```

Para simular el onboarding de un connected account en modo TEST:
- Seguir el link de onboarding
- Usar datos de prueba: número de cuenta bancaria `000123456789`, routing `110000000`

---

## Notas importantes

- **¿La sucursal puede ver sus pagos?** Sí — Stripe Express les da un dashboard simplificado en `express.stripe.com` donde ven sus transacciones y payouts.
- **¿Cuándo llega el dinero a la sucursal?** Stripe hace payouts automáticos (por defecto diario o semanal según el país). La sucursal puede cambiar la frecuencia desde su dashboard.
- **¿Qué pasa si la sucursal no completa el onboarding?** El `stripe_account_id` se crea de todos modos, pero `charges_enabled = false`. Los pagos con tarjeta a esa sucursal fallarán hasta que complete el KYC. Mientras tanto, solo puede usar métodos locales (Yape, efectivo, etc.).
- **¿Reembolsos?** Se hacen desde el backend con `StripeService.refund(paymentIntentId)`. Si hay `transfer_data`, Stripe revierte automáticamente la transferencia al connected account.
