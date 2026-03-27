const redisClient = require('../../config/redisConfig');

/**
 * Utilidad para manejar operaciones de cache con Redis
 * Proporciona métodos para generar claves, obtener, establecer y eliminar datos de cache
 */
class CacheUtility {
    constructor() {
        this.isEnabled = process.env.REDIS_ENABLED === 'true';
        this.defaultTTL = parseInt(process.env.REDIS_TTL) || 3600;
    }

    /**
     * Genera una clave de cache única basada en un prefijo y parámetros
     * @param {string} prefix - Prefijo para la clave (ej: 'companies:all')
     * @param {object} params - Parámetros que afectan el resultado (ej: filtros, paginación)
     * @returns {string} Clave de cache única
     */
    generateKey(prefix, params = {}) {
        if (typeof prefix !== 'string') {
            throw new Error('El prefijo debe ser una cadena');
        }

        const paramsString = Object.keys(params).length > 0 
            ? `:${JSON.stringify(params)}` 
            : '';
        
        return `${prefix}${paramsString}`;
    }

    /**
     * Obtiene un valor de cache
     * @param {string} key - Clave de cache
     * @returns {Promise<*>} Valor almacenado en cache o null si no existe
     */
    async get(key) {
        if (!this.isEnabled) {
            return null;
        }

        return await redisClient.get(key);
    }

    /**
     * Establece un valor en cache
     * @param {string} key - Clave de cache
     * @param {*} value - Valor a almacenar
     * @param {number} ttl - Tiempo de vida en segundos (opcional, usa defaultTTL si no se especifica)
     * @returns {Promise<boolean>} True si se almacenó correctamente, false en caso contrario
     */
    async set(key, value, ttl = this.defaultTTL) {
        if (!this.isEnabled) {
            return false;
        }

        return await redisClient.set(key, value, ttl);
    }

    /**
     * Elimina un valor de cache
     * @param {string} key - Clave de cache
     * @returns {Promise<boolean>} True si se eliminó correctamente, false en caso contrario
     */
    async del(key) {
        if (!this.isEnabled) {
            return false;
        }

        return await redisClient.del(key);
    }

    /**
     * Elimina todos los valores de cache que coincidan con un patrón
     * @param {string} pattern - Patrón de clave (ej: 'companies:all:*')
     * @returns {Promise<boolean>} True si se eliminaron correctamente, false en caso contrario
     */
    async delByPattern(pattern) {
        if (!this.isEnabled) {
            return false;
        }

        return await redisClient.delByPattern(pattern);
    }

    /**
     * Método para manejar operaciones de cache en un solo lugar
     * Ideal para métodos que obtienen datos de una fuente y los cachean
     * @param {string} prefix - Prefijo para la clave de cache
     * @param {object} params - Parámetros que afectan el resultado
     * @param {function} fetchFn - Función que obtiene los datos de la fuente original
     * @param {number} ttl - Tiempo de vida en segundos (opcional)
     * @returns {Promise<*>} Datos desde cache o fuente original
     */
    async withCache(prefix, params, fetchFn, ttl = this.defaultTTL) {
        if (!this.isEnabled) {
            return await fetchFn();
        }

        const key = this.generateKey(prefix, params);
        const cachedData = await this.get(key);
        
        if (cachedData) {
            return cachedData;
        }

        const data = await fetchFn();
        await this.set(key, data, ttl);
        
        return data;
    }
}

// Exportar instancia singleton
const cacheUtility = new CacheUtility();
module.exports = cacheUtility;
