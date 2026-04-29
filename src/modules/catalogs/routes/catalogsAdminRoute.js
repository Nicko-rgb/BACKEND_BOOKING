/**
 * catalogsAdminRoute.js
 * Rutas administrativas de catálogos del sistema — todas protegidas por permisos.
 * Prefijo: /api/catalogs/admin
 *
 * Endpoints estándar por catálogo (generados por registerCatalogRoutes):
 *   GET    /<path>           — lista paginada con ?search=&page=&limit=
 *   GET    /<path>/:id       — detalle
 *   POST   /<path>           — crear
 *   PUT    /<path>/:id       — actualizar
 *   PATCH  /<path>/:id/toggle — activar/desactivar (si el catálogo soporta)
 *   DELETE /<path>/:id       — eliminar (bloqueado si tiene referencias FK)
 */

const express = require('express');
const router = express.Router();

const { Country, SportType, SportCategory, SurfaceType, PaymentType, Ubigeo, MenuItem } = require('../models');
const { protegerPermiso } = require('../../../shared/middlewares/proteger');
const { validateDTO } = require('../../../shared/middlewares/validateDTO');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { ConflictError } = require('../../../shared/errors/CustomErrors');
const CatalogController = require('../controllers/CatalogController');
const schemas = require('../dtos/catalogsAdminDto');

const asyncHandler = GlobalErrorHandler.asyncHandler;

/**
 * Helper — registra las 6 rutas CRUD estándar de un catálogo en el router.
 * @param {string} path             Segmento de URL (ej. 'sport-types')
 * @param {string} permission       Permiso requerido (ej. 'sport_type.manage')
 * @param {Object} dto              { create, update } schemas Joi
 * @param {Object} config           Config consumida por CatalogService
 */
const registerCatalogRoutes = (path, permission, dto, config) => {
    const auth = protegerPermiso(permission);

    router.get(   `/${path}`,               ...auth, asyncHandler(CatalogController.list(config)));
    router.get(   `/${path}/:id`,           ...auth, asyncHandler(CatalogController.getById(config)));
    router.post(  `/${path}`,               ...auth, validateDTO(dto.create), asyncHandler(CatalogController.create(config)));
    router.put(   `/${path}/:id`,           ...auth, validateDTO(dto.update), asyncHandler(CatalogController.update(config)));
    router.delete(`/${path}/:id`,           ...auth, asyncHandler(CatalogController.remove(config)));

    // Toggle solo si el catálogo define activeField ──────────────────────
    if (config.activeField) {
        router.patch(`/${path}/:id/toggle`, ...auth, asyncHandler(CatalogController.toggleActive(config)));
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CATÁLOGOS
// ═══════════════════════════════════════════════════════════════════════════

// ── Países ──────────────────────────────────────────────────────────────────
registerCatalogRoutes('countries', 'country.manage', schemas.country, {
    model: Country,
    pkField: 'country_id',
    entityLabel: 'país',
    entityLabelPlural: 'países',
    uniqueFields: ['iso_country'],
    searchableFields: ['country', 'iso_country', 'iso_currency'],
    defaultOrder: [['country', 'ASC']],
    withAudit: true,
    checkReferences: async (country) => {
        const companies = await country.countCompanies();
        if (companies > 0) {
            throw new ConflictError('No se puede eliminar un país con empresas asociadas');
        }
    }
});

// ── Tipos de deporte ────────────────────────────────────────────────────────
registerCatalogRoutes('sport-types', 'sport_type.manage', schemas.sportType, {
    model: SportType,
    pkField: 'sport_type_id',
    entityLabel: 'tipo de deporte',
    entityLabelPlural: 'tipos de deporte',
    uniqueFields: ['code'],
    searchableFields: ['code', 'name'],
    activeField: 'is_active',
    defaultOrder: [['name', 'ASC']],
    checkReferences: async (sport) => {
        const spaces = await sport.countSpaces();
        if (spaces > 0) {
            throw new ConflictError('No se puede eliminar un deporte con espacios asociados — desactívalo en su lugar');
        }
    }
});

// ── Categorías deportivas ───────────────────────────────────────────────────
registerCatalogRoutes('sport-categories', 'sport_category.manage', schemas.sportCategory, {
    model: SportCategory,
    pkField: 'sport_category_id',
    entityLabel: 'categoría deportiva',
    entityLabelPlural: 'categorías deportivas',
    uniqueFields: ['code'],
    searchableFields: ['code', 'name'],
    defaultOrder: [['name', 'ASC']],
    checkReferences: async (category) => {
        const spaces = await category.countSpaces();
        if (spaces > 0) {
            throw new ConflictError('No se puede eliminar una categoría con espacios asociados');
        }
    }
});

// ── Tipos de superficie ─────────────────────────────────────────────────────
registerCatalogRoutes('surface-types', 'surface_type.manage', schemas.surfaceType, {
    model: SurfaceType,
    pkField: 'surface_type_id',
    entityLabel: 'tipo de superficie',
    entityLabelPlural: 'tipos de superficie',
    uniqueFields: ['code'],
    searchableFields: ['code', 'name'],
    defaultOrder: [['name', 'ASC']],
    checkReferences: async (surface) => {
        const spaces = await surface.countSpaces();
        if (spaces > 0) {
            throw new ConflictError('No se puede eliminar una superficie con espacios asociados');
        }
    }
});

// ── Tipos de pago ───────────────────────────────────────────────────────────
registerCatalogRoutes('payment-types', 'payment_type.manage', schemas.paymentType, {
    model: PaymentType,
    pkField: 'payment_type_id',
    entityLabel: 'tipo de pago',
    entityLabelPlural: 'tipos de pago',
    uniqueFields: [],
    searchableFields: ['name', 'code', 'provider'],
    filterFields: ['country_id', 'category'],
    activeField: 'is_enabled',
    include: [{ model: Country, as: 'country', attributes: ['country_id', 'country', 'iso_country', 'currency_simbol'] }],
    defaultOrder: [['country_id', 'ASC'], ['name', 'ASC']],
    checkReferences: async (paymentType) => {
        const payments = await paymentType.countPayments();
        if (payments > 0) {
            throw new ConflictError('No se puede eliminar un tipo de pago con transacciones registradas — desactívalo en su lugar');
        }
    }
});

// ── Ubigeo ──────────────────────────────────────────────────────────────────
registerCatalogRoutes('ubigeo', 'ubigeo.manage', schemas.ubigeo, {
    model: Ubigeo,
    pkField: 'ubigeo_id',
    entityLabel: 'ubigeo',
    entityLabelPlural: 'ubigeos',
    uniqueFields: ['code'],
    searchableFields: ['code', 'name'],
    filterFields: ['country_id', 'parent_id', 'level'],
    defaultOrder: [['country_id', 'ASC'], ['level', 'ASC'], ['name', 'ASC']],
    checkReferences: async (ubigeo) => {
        const children = await ubigeo.countChildren();
        if (children > 0) {
            throw new ConflictError('No se puede eliminar un ubigeo con niveles geográficos hijos');
        }
    }
});

// ── Ítems de menú ────────────────────────────────────────────────────────────
registerCatalogRoutes('menu-items', 'menu.manage', schemas.menuItem, {
    model: MenuItem,
    pkField: 'menu_id',
    entityLabel: 'ítem de menú',
    entityLabelPlural: 'ítems de menú',
    uniqueFields: ['key'],
    searchableFields: ['key', 'label', 'path'],
    filterFields: ['app_access', 'group_title'],
    activeField: 'is_active',
    defaultOrder: [['group_title', 'ASC'], ['sort_order', 'ASC']],
});

module.exports = router;
