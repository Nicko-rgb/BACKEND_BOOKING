/**
 * configRoutes.js
 * Configuración de branding y métodos de pago activos por empresa/sucursal.
 * Montado en /api/companies
 */
const express = require('express');
const router = express.Router();

const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const { paymentActiveSchema } = require('../dto/PaymentConfigurationDto');
const { protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const upload = require('../../../shared/middlewares/uploadMiddleware');
const ConfigurationController = require('../controllers/ConfigurationController');

// ── Configuración de empresa (logo, banner, datos de contacto) ────────────────

router.get(
    '/config/:companyId',
    ...protegerPermisoConScope('facility.manage_own'),
    GlobalErrorHandler.asyncHandler(ConfigurationController.getConfiguration)
);

router.post(
    '/config/:companyId',
    ...protegerPermisoConScope('facility.manage_own'),
    upload.fields([
        { name: 'logo',   maxCount: 1 },
        { name: 'banner', maxCount: 1 },
    ]),
    GlobalErrorHandler.asyncHandler(ConfigurationController.saveConfiguration)
);

router.delete(
    '/config/:companyId/media/:mediaField',
    ...protegerPermisoConScope('facility.manage_own'),
    GlobalErrorHandler.asyncHandler(ConfigurationController.deleteConfigMedia)
);

// ── Métodos de pago activos ───────────────────────────────────────────────────

router.post(
    '/payments-active',
    ...protegerPermisoConScope('company.manage_own'),
    validateDTO(paymentActiveSchema),
    GlobalErrorHandler.asyncHandler(ConfigurationController.saveActivePayments)
);

module.exports = router;
