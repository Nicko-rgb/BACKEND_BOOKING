/**
 * Repository para Configuration - Capa de acceso a datos
 * 
 * Maneja las operaciones de base de datos para la configuración de la compañía.
 */
const Configuration = require('../models/Configuration');

/**
 * Obtener la configuración por el ID de la compañía
 */
const findByCompanyId = async (companyId, transaction = null) => {
    const options = {
        where: { company_id: companyId }
    };
    if (transaction) options.transaction = transaction;
    
    return await Configuration.findOne(options);
};

/**
 * Crear o actualizar la configuración
 */
const upsert = async (companyId, configData, userId, transaction = null) => {
    const options = transaction ? { transaction } : {};
    
    const [config, created] = await Configuration.findOrCreate({
        where: { company_id: companyId },
        defaults: {
            ...configData,
            company_id: companyId,
            user_create: userId,
            user_update: userId
        },
        ...options
    });

    if (!created) {
        await config.update({
            ...configData,
            user_update: userId
        }, options);
    }

    return config;
};

module.exports = {
    findByCompanyId,
    upsert
};
