/**
 * companyRoutes.js
 * CRUD de empresas y sucursales + endpoints públicos de sucursales.
 * Montado en /api/companies
 */
const express = require('express');
const router = express.Router();

const { validateQuery } = require('../../../shared/middlewares/validateDTO');
const { queryParamsSchema, publicSucursalQueryDto } = require('../dto/CompanyDto');
const { protegerPermiso, protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const upload = require('../../../shared/middlewares/uploadMiddleware');

const {
    registerCompany,
    getAllCompanies,
    getCompanyDetails,
    getSubsidiaryDetails,
    updateCompany,
    toggleCompanyEnabled,
    getPublicSucursales,
    getPublicSucursal,
} = require('../controllers/CompanyController');

// ── Gestión de empresas y sucursales (admin) ──────────────────────────────────

router.get(
    '/get-companys',
    ...protegerPermiso('company.manage_own'),
    validateQuery(queryParamsSchema),
    GlobalErrorHandler.asyncHandler(getAllCompanies)
);

router.get(
    '/details/:id',
    ...protegerPermisoConScope('facility.manage_own'),
    GlobalErrorHandler.asyncHandler(getCompanyDetails)
);

router.get(
    '/subsidiary/:id',
    ...protegerPermisoConScope('booking.view_facility'),
    GlobalErrorHandler.asyncHandler(getSubsidiaryDetails)
);

router.post(
    '/register',
    ...protegerPermiso('company.manage_all'),
    upload.fields([{ name: 'main_image', maxCount: 1 }]),
    GlobalErrorHandler.asyncHandler(registerCompany)
);

router.put(
    '/update/:id',
    ...protegerPermisoConScope('facility.manage_own'),
    upload.fields([{ name: 'main_image', maxCount: 1 }]),
    GlobalErrorHandler.asyncHandler(updateCompany)
);

router.put(
    '/active-inactive/:id',
    ...protegerPermiso('company.manage_all'),
    GlobalErrorHandler.asyncHandler(toggleCompanyEnabled)
);

// ── Portal de Reservas — sucursales públicas ──────────────────────────────────

router.get('/public/subsidiaries',      validateQuery(publicSucursalQueryDto), GlobalErrorHandler.asyncHandler(getPublicSucursales));
router.get('/public/subsidiaries/:id',  GlobalErrorHandler.asyncHandler(getPublicSucursal));

module.exports = router;
