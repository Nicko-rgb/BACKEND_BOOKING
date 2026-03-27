const ConfigurationService = require('../services/ConfigurationService');
const ApiResponse = require('../../../shared/utils/ApiResponse');

/**
 * Obtener configuración
 */
const getConfiguration = async (res, companyId) => {
    const config = await ConfigurationService.getConfiguration(companyId);
    return ApiResponse.ok(res, config, 'Configuración obtenida correctamente.');
};

/**
 * Guardar configuración
 */
const saveConfiguration = async (res, companyId, configData, userId, files) => {
    const config = await ConfigurationService.saveConfiguration(companyId, configData, userId, files);
    return ApiResponse.ok(res, config, 'Configuración guardada exitosamente.');
};

/**
 * Eliminar imagen de configuración (logo, yape_qr, plin_qr)
 */
const deleteConfigMedia = async (res, companyId, mediaField) => {
    const result = await ConfigurationService.deleteConfigMedia(companyId, mediaField);
    return ApiResponse.ok(res, result, 'Imagen eliminada correctamente.');
};

module.exports = {
    getConfiguration,
    saveConfiguration,
    deleteConfigMedia,
};
