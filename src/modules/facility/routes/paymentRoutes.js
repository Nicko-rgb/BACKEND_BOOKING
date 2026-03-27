/**
 * paymentRoutes.js
 * Cuentas de pago por sucursal y endpoints públicos de métodos de pago.
 * Montado en /api/companies
 */
const express = require('express');
const router = express.Router();

const { protegerPermiso, protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const upload = require('../../../shared/middlewares/uploadMiddleware');
const PaymentAccountController = require('../controllers/PaymentAccountController');
const { getPaymentMethods } = require('../controllers/CompanyController');

// ── Cuentas de pago (admin) ───────────────────────────────────────────────────

router.get(
    '/payment-accounts/sucursal/:sucursalId',
    ...protegerPermiso('facility.manage_own'),
    GlobalErrorHandler.asyncHandler(PaymentAccountController.getAccountsBySucursal)
);

router.get(
    '/payment-accounts/sucursal/:sucursalId/type/:paymentTypeId',
    ...protegerPermiso('facility.manage_own'),
    GlobalErrorHandler.asyncHandler(PaymentAccountController.getAccountsByType)
);

router.post(
    '/payment-accounts',
    ...protegerPermisoConScope('company.manage_own'),
    upload.fields([{ name: 'qr_image', maxCount: 1 }]),
    GlobalErrorHandler.asyncHandler(PaymentAccountController.createAccount)
);

router.put(
    '/payment-accounts/:id',
    ...protegerPermiso('company.manage_own'),
    upload.fields([{ name: 'qr_image', maxCount: 1 }]),
    GlobalErrorHandler.asyncHandler(PaymentAccountController.updateAccount)
);

router.delete(
    '/payment-accounts/:id',
    ...protegerPermiso('company.manage_own'),
    GlobalErrorHandler.asyncHandler(PaymentAccountController.deleteAccount)
);

// ── Portal de Reservas — endpoints públicos de pago ──────────────────────────

router.get(
    '/public/subsidiaries/:id/payment-methods',
    GlobalErrorHandler.asyncHandler(getPaymentMethods)
);

router.get(
    '/public/subsidiaries/:id/payment-accounts',
    GlobalErrorHandler.asyncHandler(PaymentAccountController.getAccountsBySucursal)
);

module.exports = router;
