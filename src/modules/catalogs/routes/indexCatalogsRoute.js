const express = require('express');
const router = express.Router();
const CountryController = require('../controllers/CountryController');
const RoleController = require('../controllers/RoleController');
const CommonCatalogController = require('../controllers/CommonCatalogController');
const PaymentTypeController = require('../controllers/PaymentTypeController');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');

/**
* Rutas unificadas de catálogos
* Prefijo: /api/catalogs
*/

// Países
router.get('/countries', GlobalErrorHandler.asyncHandler(CountryController.getCountries));

// Roles
router.get('/roles', GlobalErrorHandler.asyncHandler(RoleController.getRoles));

// Deportes
router.get('/sport-types', GlobalErrorHandler.asyncHandler(CommonCatalogController.getSportTypes));

// Superficies
router.get('/surface-types', GlobalErrorHandler.asyncHandler(CommonCatalogController.getSurfaceTypes));

// Categorías
router.get('/sport-categories', GlobalErrorHandler.asyncHandler(CommonCatalogController.getSportCategories));

// Ubigeo — GET /catalogs/ubigeo?country_id=6 o ?parent_id=123
router.get('/ubigeo', GlobalErrorHandler.asyncHandler(CommonCatalogController.getUbigeo));

// Tipos de Pago
router.get('/payment-types', GlobalErrorHandler.asyncHandler(PaymentTypeController.getAllPaymentTypes));
router.get('/payment-types/country/:countryId', GlobalErrorHandler.asyncHandler(PaymentTypeController.getPaymentTypesByCountry));

module.exports = router;
