# Integración YAPE vía MercadoPago — IMPLEMENTADO

> Reemplaza el flujo manual de YAPE (comprobante + confirmación del admin) por un
> cobro automático procesado por la API de MercadoPago. CASH, PLIN y BANK_TRANSFER
> no cambian (siguen siendo manuales). Estado: **implementado y verificado (lint + syntax)**.

---

## ⚠️ Corrección clave sobre el plan original

El plan inicial asumía que MercadoPago cobra **solo con el número de celular**. **Eso es falso.**
MercadoPago YAPE (Perú) exige un **código de aprobación (OTP) de 6 dígitos** que el cliente
genera en su app Yape. Con `celular + OTP`, el SDK del navegador genera un **token de un solo
uso**, y ese token es lo que el backend cobra. Sin OTP/token, MP rechaza el pago.

- `@mercadopago/sdk-react@1.0.7` **NO** trae componente Yape.
- Se usa `@mercadopago/sdk-js@0.0.3` → `mp.yape({ otp, phoneNumber }).create()` → `{ id: token }`.

---

## Flujo actual vs nuevo

| Paso | YAPE Manual (eliminado) | YAPE MercadoPago (nuevo) |
|------|-------------------------|--------------------------|
| 1 | Usuario ve número/QR de la sucursal | Usuario ingresa su celular **+ código de aprobación (6 díg.)** |
| 2 | Transfiere desde su app | El SDK genera un token; el backend cobra al instante |
| 3 | Sube captura de pantalla | No sube nada |
| 4 | Reserva queda PENDING | `approved` → CONFIRMED al instante · `pending` → PENDING (webhook confirma) |
| 5 | Admin revisa y confirma | Admin no interviene |

---

## Arquitectura

```
PaymentStrategyFactory
  CASH          → CashPaymentStrategy          (sin cambio)
  YAPE          → YapeMercadoPagoStrategy       ← REEMPLAZADO (antes YapePaymentStrategy, ELIMINADO)
  PLIN          → PlinPaymentStrategy          (sin cambio — sigue manual con comprobante)
  BANK_TRANSFER → BankTransferPaymentStrategy  (sin cambio)
  CARD_ONLINE   → CardOnlinePaymentStrategy    (sin cambio — Stripe)
```

### Flujo de datos
```
FRONTEND (YapeMercadoPagoForm)
  celular + OTP → mp.yape({otp, phoneNumber}).create() → yape_token
  POST /api/reservations
    payment_method_code: 'YAPE'
    payment_details: { yape_token, yape_phone, yape_email }

BACKEND (BookingService.processBooking)
  Fase 7   → crea Bookings en PENDING
  Fase 8   → YapeMercadoPagoStrategy.process()
               MP POST /v1/payments { token, payment_method_id:'yape', payer:{email}, external_reference }
                 approved → status 'PAID',  gateway 'YAPE_MP'
                 pending  → status 'PENDING'
                 rejected → throw → rollback (no se crea reserva)
  Fase 8.1 → si paymentResult.status === 'PAID' → promueve los Bookings a CONFIRMED
  Fase 9   → crea PaymentBooking con transaction_id = external_reference

WEBHOOK (solo respaldo para 'pending' → 'approved')
  POST /api/v1/booking-webhooks/webhook
    re-consulta el pago a MP (anti-fraude)
    si approved → busca PaymentBooking PENDING por transaction_id = external_reference + gateway YAPE_MP
    → PaymentBooking PAID + Bookings CONFIRMED + emite socket
```

---

## BACKEND — archivos

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `strategies/YapeMercadoPagoStrategy.js` | **NUEVO** — cobra con token Yape, mapea estados MP |
| 2 | `strategies/YapePaymentStrategy.js` | **ELIMINADO** — YAPE manual deprecado |
| 3 | `strategies/PaymentStrategyFactory.js` | `YAPE: new YapeMercadoPagoStrategy()` |
| 4 | `services/BookingService.js` | Fase 8.1 (promoción a CONFIRMED) + `_buildPaymentInstructions` sin YAPE |
| 5 | `dto/BookingDto.js` | `payment_details`: `yape_token`, `yape_phone`, `yape_email` |
| 6 | `services/BookingWebhookService.js` | **NUEVO** — respaldo asíncrono, idempotente, anti-fraude |
| 7 | `handlers/BookingWebhookHandler.js` | **NUEVO** |
| 8 | `controllers/BookingWebhookController.js` | **NUEVO** |
| 9 | `routes/bookingWebhookRoutes.js` | **NUEVO** — `POST /webhook` público |
| 10 | `server.js` | `app.use('/api/v1/booking-webhooks', bookingWebhookRoutes)` |
| 11 | `seeders/006_payment_types.js` | Descripción/provider de YAPE actualizados (MercadoPago) |

### Decisión importante en BookingService
**NO se quitó `'YAPE'` de `isPendingMethod`** (a diferencia del plan original). Las reservas se
crean **antes** de cobrar; si se quitara, una reserva quedaría CONFIRMED aunque MP devolviera
`pending`. En su lugar: se crean PENDING y la **Fase 8.1** las promueve a CONFIRMED solo si el
cobro fue `approved`. Si MP devuelve `pending`, quedan PENDING y el webhook las confirma.

---

## FRONTEND_BOOKING — archivos

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `PaymentForms/YapeMercadoPagoForm.jsx` | **NUEVO** — inputs celular + OTP, genera token con sdk-js |
| 2 | `PaymentForms/YapeForm.jsx` | **SIN CAMBIO** — ahora solo lo usa PLIN (flujo manual) |
| 3 | `MethodsPayment.jsx` | `case 'yape'` → `<YapeMercadoPagoForm>`; `PENDING_METHODS` sin 'yape' |

> El payload de YAPE viaja en `payment_details: { yape_token, yape_phone, yape_email }`.
> `uploadPaymentProof` queda solo para PLIN/BANK (no se llama para YAPE).

---

## ADMINISTRATOR_BOOKING — archivos

| # | Archivo | Cambio |
|---|---------|--------|
| 1 | `components/DetalleReserva.jsx` | `isAutoPayment = gateway === 'YAPE_MP'` → oculta confirmar/rechazar (individual, masivo e inferior) + badge "Pago automático" |
| 2 | `styles/DetalleReserva.css` | `.auto-payment-badge` |

---

## Base de datos
Sin migraciones. `payment_gateway` (VARCHAR) almacena `'YAPE_MP'`; `transaction_id` guarda el
`external_reference` (`YAPE-<uuid8>-<timestamp>`) que usa el webhook para casar el pago.

---

## Variables de entorno
```
BACKEND_URL=https://api.redepor.com   # DEBE ser pública/HTTPS — MP rechaza notification_url localhost
MP_ACCESS_TOKEN=APP_USR-...           # cuenta con YAPE habilitado (Perú)
VITE_MP_PUBLIC_KEY=APP_USR-...        # frontend (ya existe)
```
`notification_url` = `https://api.redepor.com/api/v1/booking-webhooks/webhook`

---

## Riesgos conocidos
- **A — `notification_url` localhost:** MP exige URL pública; en dev usar túnel (ngrok) o `BACKEND_URL` prod.
- **B — Doble cobro teórico:** si MP aprueba pero el commit de BD falla → cliente cobrado sin reserva. Ventana de milisegundos; mismo riesgo que el flujo SaaS.
- **C — Locks durante HTTP:** el `SELECT FOR UPDATE` se mantiene mientras MP responde (~1-3s). Igual que la estrategia Stripe.
- **D — Comisión MP no registrada:** `comision_aplicada=0`; MP cobra ~2-3% en su lado. Configurar `commission_percentage` en el seed YAPE si se quiere trasladar.

---

## Checklist de pruebas
- [ ] YAPE `approved` → reserva CONFIRMED de inmediato, navega a comprobante
- [ ] YAPE `rejected` (OTP malo / sin saldo) → error claro, sin reserva creada (rollback)
- [ ] YAPE `pending` → reserva PENDING; webhook la confirma al aprobarse
- [ ] Admin: reservas YAPE_MP sin botones manuales, con badge automático
- [ ] Admin: CASH y PLIN siguen mostrando confirmar/rechazar
- [ ] Webhook idempotente: doble notificación no duplica nada
- [ ] CASH / PLIN / BANK_TRANSFER / Stripe sin regresión

---

## Lo que NO cambió
- `CashPaymentStrategy`, `PlinPaymentStrategy`, `BankTransferPaymentStrategy`, `CardOnlinePaymentStrategy`
- Confirmación manual para CASH / PLIN / BANK_TRANSFER
- Modelos `PaymentBooking` / `Booking` (sin migración)
- Webhook Stripe y webhook SaaS (rutas separadas, sin interferencia)
