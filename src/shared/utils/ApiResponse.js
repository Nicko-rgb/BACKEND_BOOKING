// Respuestas de la API

// Respuesta exitosa
const ok = (res, data = null, message = 'Operación exitosa', status = 200, extra = {}) => {
    const payload = {
        success: true,
        data,
        message: message + '-server',
        timestamp: new Date().toISOString(),
        ...extra
    }
    return res.status(status).json(payload) 
}

// Respuesta de creación exitosa
const created = (res, data = null, message = 'Creado exitosamente', extra = {}) => {
    return ok(res, data, message, 201, extra)
}

// Respuesta de error
const error = (req, res, code = 'ERROR', message = 'Error', details = null, status = 400) => {
    const payload = {
        success: false,
        error: {
            code,
            message: message + '-server',
            details
        },
        timestamp: new Date().toISOString(),
        path: req?.path || null
    }
    return res.status(status).json(payload)
}

module.exports = {
    ok,
    created,
    error
}
