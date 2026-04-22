/**
 * CatalogHandler.js
 * Handler genérico para los endpoints admin de catálogos.
 * Recibe valores ya parseados desde el Controller y estructura la respuesta
 * usando ApiResponse.
 */

const ApiResponse = require('../../../shared/utils/ApiResponse');
const CatalogService = require('../services/CatalogService');

// Helper — etiqueta plural ────────────────────────────────────────────────────
const plural = (config) => config.entityLabelPlural || `${config.entityLabel}s`;

const list = async (res, config, query) => {
    const data = await CatalogService.list(config, query);
    return ApiResponse.ok(res, data, `Lista de ${plural(config)} obtenida`);
};

const getById = async (res, config, id) => {
    const data = await CatalogService.getById(config, id);
    return ApiResponse.ok(res, data, `${config.entityLabel} obtenido`);
};

const create = async (res, config, data, user) => {
    const entity = await CatalogService.create(config, data, user);
    return ApiResponse.created(res, entity, `${config.entityLabel} creado exitosamente`);
};

const update = async (res, config, id, data, user) => {
    const entity = await CatalogService.update(config, id, data, user);
    return ApiResponse.ok(res, entity, `${config.entityLabel} actualizado exitosamente`);
};

const toggleActive = async (res, config, id) => {
    const entity = await CatalogService.toggleActive(config, id);
    return ApiResponse.ok(res, entity, `Estado del ${config.entityLabel} actualizado`);
};

const remove = async (res, config, id) => {
    await CatalogService.remove(config, id);
    return ApiResponse.ok(res, null, `${config.entityLabel} eliminado exitosamente`);
};

module.exports = { list, getById, create, update, toggleActive, remove };
