/**
 * Handler de errores global para toda la aplicación
 * Centraliza el manejo de errores para evitar redundancia entre módulos
 */
const ApiResponse = require('../utils/ApiResponse')

class GlobalErrorHandler {
    /**
     * Maneja errores de manera centralizada
     * @param {Error} error - Error a manejar
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware function
     */
    static handleError(error, req, res, next) {
        // Log del error para el desarrollador en la terminal del backend (solo en desarrollo)
        if (process.env.NODE_ENV === 'development') {
            console.error(' [Backend Error] ', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                path: req.path,
                method: req.method
            });
        }

        // Error de validación personalizado (desde validateDTO)
        if (error.name === 'ValidationError' && error.statusCode === 400) {
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', error.message, error.details || error.errors, 400)
        }

        // Error de validación de Joi (directo si no pasa por validateDTO)
        if (error.name === 'ValidationError' && error.isJoi) {
            const details = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value
            }))
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', 'Datos inválidos', details, 400)
        }

        // Error de Sequelize - Constraint único
        if (error.name === 'SequelizeUniqueConstraintError') {
            const field = error.errors[0]?.path || 'campo';
            const details = { field, value: error.errors[0]?.value }
            return ApiResponse.error(req, res, 'DUPLICATE_ENTRY', `Ya existe un registro con este ${field}`, details, 409)
        }

        // Error de Sequelize - Validación
        if (error.name === 'SequelizeValidationError') {
            const details = error.errors.map(err => ({
                field: err.path,
                message: err.message,
                value: err.value
            }))
            return ApiResponse.error(req, res, 'VALIDATION_ERROR', 'Error de validación en la base de datos', details, 400)
        }

        // Error de Sequelize - Foreign Key
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            const details = { field: error.fields, table: error.table }
            return ApiResponse.error(req, res, 'FOREIGN_KEY_ERROR', 'Referencia inválida a otro registro', details, 400)
        }

        // Error de Sequelize - Database Connection
        if (error.name === 'SequelizeConnectionError') {
            return ApiResponse.error(req, res, 'DATABASE_CONNECTION_ERROR', 'Error de conexión con la base de datos', null, 503)
        }

        // Error de Sequelize - Timeout
        if (error.name === 'SequelizeTimeoutError') {
            return ApiResponse.error(req, res, 'DATABASE_TIMEOUT', 'Tiempo de espera agotado en la base de datos', null, 408)
        }

        // Error de Sequelize - Database Error (errores específicos de la base de datos)
        if (error.name === 'SequelizeDatabaseError') {
            // Error de tipo de dato inválido (ej: "get-companys" a bigint)
            if (error.parent && error.parent.code === '22P02') {
                return ApiResponse.error(req, res, 'INVALID_DATA_TYPE', 'Error en los parámetros de consulta - Valor no válido para el tipo de dato esperado', null, 400)
            }
            
            // Otros errores de base de datos
            return ApiResponse.error(req, res, 'DATABASE_ERROR', 'Error en la operación de base de datos', null, 500)
        }

        // Error de autenticación JWT
        if (error.name === 'TokenExpiredError') {
            return ApiResponse.error(req, res, 'TOKEN_EXPIRED', 'Token expirado', null, 401)
        }

        if (error.name === 'JsonWebTokenError') {
            return ApiResponse.error(req, res, 'INVALID_TOKEN', 'Token inválido', null, 401)
        }

        // Errores personalizados con statusCode
        if (error.statusCode) {
            const code = error.name || 'CUSTOM_ERROR'
            return ApiResponse.error(req, res, code, error.message, error.details || null, error.statusCode)
        }

        // Error genérico del servidor
        return ApiResponse.error(req, res, 'INTERNAL_SERVER_ERROR', 'Error interno del servidor', null, 500)
    }

    /**
     * Wrapper para funciones async que maneja errores automáticamente
     * @param {Function} fn - Función async a envolver
     * @returns {Function} - Función envuelta con manejo de errores
     */
    static asyncHandler(fn) {
        return (req, res, next) => {
            Promise.resolve(fn(req, res, next)).catch(next);
        };
    }

    /**
     * Middleware para rutas no encontradas
     * @param {Object} req - Request object
     * @param {Object} res - Response object
     * @param {Function} next - Next middleware function
     */
    static notFound(req, res, next) {
        const error = new Error(`Ruta no encontrada en el servidor - ${req.originalUrl}`);
        error.statusCode = 404;
        next(error);
    }
}

module.exports = GlobalErrorHandler;
