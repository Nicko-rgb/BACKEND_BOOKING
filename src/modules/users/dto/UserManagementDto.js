const Joi = require('joi');

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS de validación de entrada
// ─────────────────────────────────────────────────────────────────────────────

const createPermissionDto = Joi.object({
    key:        Joi.string().pattern(/^[a-z_]+\.[a-z_]+$/).max(100).required().messages({
        'string.pattern.base': 'La clave debe tener formato modulo.accion (ej: booking.confirm).',
        'any.required':        'La clave es obligatoria.',
    }),
    label:      Joi.string().min(3).max(150).required().messages({ 'any.required': 'El label es obligatorio.' }),
    module:     Joi.string().max(50).required().messages({ 'any.required': 'El módulo es obligatorio.' }),
    app_access: Joi.string().valid('booking', 'admin', 'both').default('admin'),
    description: Joi.string().max(500).allow('', null).optional(),
});

const updatePermissionDto = Joi.object({
    label:      Joi.string().min(3).max(150).optional(),
    app_access: Joi.string().valid('booking', 'admin', 'both').optional(),
    description: Joi.string().max(500).allow('', null).optional(),
}).min(1).messages({ 'object.min': 'Debe enviar al menos un campo para actualizar.' });

const setUserPermissionsDto = Joi.object({
    permission_keys: Joi.array()
        .items(Joi.string().min(3).max(100))
        .required()
        .messages({
            'array.base':   'permission_keys debe ser un array.',
            'any.required': 'permission_keys es obligatorio.',
        }),
});

const getUsersQueryDto = Joi.object({
    page:       Joi.number().integer().min(1).default(1),
    limit:      Joi.number().integer().min(1).max(100).default(20),
    search:     Joi.string().max(100).allow('').default(''),
    role:       Joi.string().max(50).allow('').default(''),
    company_id: Joi.number().integer().positive().optional(),
});

// Asignar un usuario super_admin existente como propietario de una empresa
const assignOwnerDto = Joi.object({
    user_id:    Joi.number().integer().positive().required().messages({
        'any.required': 'El user_id es obligatorio.',
    }),
    company_id: Joi.number().integer().positive().required().messages({
        'any.required': 'El company_id es obligatorio.',
    }),
});

module.exports = {
    createPermissionDto,
    updatePermissionDto,
    setUserPermissionsDto,
    getUsersQueryDto,
    assignOwnerDto,
};
