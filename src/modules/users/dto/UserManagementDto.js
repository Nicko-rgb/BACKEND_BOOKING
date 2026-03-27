const Joi = require('joi');

// ─────────────────────────────────────────────────────────────────────────────
// SCHEMAS de validación de entrada
// ─────────────────────────────────────────────────────────────────────────────

const updateRolePermissionsDto = Joi.object({
    permission_keys: Joi.array()
        .items(Joi.string().min(3).max(100))
        .required()
        .messages({
            'array.base':   'permission_keys debe ser un array.',
            'any.required': 'permission_keys es obligatorio.',
        }),
});

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

module.exports = {
    updateRolePermissionsDto,
    setUserPermissionsDto,
    getUsersQueryDto,
};
