/**
 * Errores personalizados para toda la aplicación
 * Estos errores son manejados por el GlobalErrorHandler
 */

/**
 * Error de validación - usado para errores de validación de datos
 */
class ValidationError extends Error {
    constructor(message, errors = []) {
        super(message);
        this.name = 'ValidationError';
        this.errors = errors;
        this.details = errors;
        this.statusCode = 400;
    }
}

/**
 * Error de recurso no encontrado
 */
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = 'NotFoundError';
        this.statusCode = 404;
    }
}

/**
 * Error de conflicto - usado para duplicados o violaciones de reglas de negocio
 */
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ConflictError';
        this.statusCode = 409;
    }
}

/**
 * Error de autorización - usuario no autorizado
 */
class UnauthorizedError extends Error {
    constructor(message = 'No autorizado') {
        super(message);
        this.name = 'UnauthorizedError';
        this.statusCode = 401;
    }
}

/**
 * Error de permisos - usuario autenticado pero sin permisos
 */
class ForbiddenError extends Error {
    constructor(message = 'Acceso prohibido') {
        super(message);
        this.name = 'ForbiddenError';
        this.statusCode = 403;
    }
}

/**
 * Error de solicitud incorrecta
 */
class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BadRequestError';
        this.statusCode = 400;
    }
}

module.exports = {
    ValidationError,
    NotFoundError,
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
    BadRequestError
};
