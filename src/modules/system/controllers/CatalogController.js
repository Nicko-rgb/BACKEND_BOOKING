/**
 * CatalogController.js
 * Controller genérico de catálogos. Cada método retorna un middleware
 * Express (req, res) configurado con el "config" del catálogo correspondiente.
 *
 * Se usa así en el router:
 *   router.get('/sport-types', ..., asyncHandler(CatalogController.list(sportTypeConfig)));
 *
 * El controller NO accede al Service ni al Repository: solo extrae valores
 * de la request y delega al Handler.
 */

const CatalogHandler = require('../handlers/CatalogHandler');

// Lista con query params (search, page, limit, filtros exactos) ──────────────
const list = (config) => async (req, res) => {
    await CatalogHandler.list(res, config, req.query);
};

// Detalle por id ──────────────────────────────────────────────────────────────
const getById = (config) => async (req, res) => {
    await CatalogHandler.getById(res, config, Number(req.params.id));
};

// Crear — usa req.validatedData producido por validateDTO ─────────────────────
const create = (config) => async (req, res) => {
    await CatalogHandler.create(res, config, req.validatedData, req.user);
};

// Actualizar ──────────────────────────────────────────────────────────────────
const update = (config) => async (req, res) => {
    await CatalogHandler.update(res, config, Number(req.params.id), req.validatedData, req.user);
};

// Activar/desactivar (requiere activeField en el config) ─────────────────────
const toggleActive = (config) => async (req, res) => {
    await CatalogHandler.toggleActive(res, config, Number(req.params.id));
};

// Eliminar (con checkReferences opcional) ─────────────────────────────────────
const remove = (config) => async (req, res) => {
    await CatalogHandler.remove(res, config, Number(req.params.id));
};

module.exports = { list, getById, create, update, toggleActive, remove };
