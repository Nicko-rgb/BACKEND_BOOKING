const { ValidationError } = require('../errors/CustomErrors')

const validateDTO = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true })
        if (error) {
            const messages = error.details.map((e) => e.message)
            return next(new ValidationError('Datos de entrada inválidos', messages))
        }
        req.validatedData = value
        next()
    }
}

const validateQuery = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true })
        if (error) {
            const messages = error.details.map((e) => e.message)
            return next(new ValidationError('Parámetros de consulta inválidos', messages))
        }
        req.validatedQuery = value
        next()
    }
}

module.exports = {
    validateDTO,
    validateQuery
}
