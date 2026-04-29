/**
 * companyRoutes.js
 * CRUD de empresas y sucursales + endpoints públicos de sucursales.
 * Montado en /api/companies
 */
const express = require('express');
const router = express.Router();

const { validateDTO, validateQuery } = require('../../../shared/middlewares/validateDTO');
const { queryParamsSchema, publicSucursalQueryDto } = require('../dto/CompanyDto');
const { createRatingDto } = require('../dto/RatingDto');
const { protegerPermiso, protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const { verificarTokenOptional } = require('../../../shared/middlewares/verificarTokenOptional');
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

const { getApprovedRatings, createRating } = require('../controllers/RatingController');
const { toggleFavorite } = require('../controllers/FavoriteController');

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

router.get('/public/subsidiaries', validateQuery(publicSucursalQueryDto), GlobalErrorHandler.asyncHandler(getPublicSucursales));

// verificarTokenOptional: enriquece con is_favorited si el usuario está autenticado ──
router.get('/public/subsidiaries/:id', verificarTokenOptional, GlobalErrorHandler.asyncHandler(getPublicSucursal));

// ── Reseñas de sucursal ───────────────────────────────────────────────────────

router.get('/public/subsidiaries/:id/ratings', GlobalErrorHandler.asyncHandler(getApprovedRatings));

router.post(
    '/public/subsidiaries/:id/ratings',
    verificarTokenAuth,
    validateDTO(createRatingDto),
    GlobalErrorHandler.asyncHandler(createRating)
);

// ── Favoritos de sucursal ─────────────────────────────────────────────────────

router.post(
    '/public/subsidiaries/:id/favorites/toggle',
    verificarTokenAuth,
    GlobalErrorHandler.asyncHandler(toggleFavorite)
);

module.exports = router;
