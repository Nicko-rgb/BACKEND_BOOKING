const Joi = require('joi')

const createUserDto = Joi.object({
    name: Joi.string().min(3).required().messages({
        'string.base': 'El nombre debe ser un texto.',
        'string.empty': 'El nombre es obligatorio.',
        'string.min': 'El nombre debe tener al menos 3 caracteres.',
        'any.required': 'El campo nombre es obligatorio.'
    }),
    lastName: Joi.string().min(3).required().messages({
        'string.base': 'El apellido debe ser un texto.',
        'string.empty': 'El apellido es obligatorio.',
        'string.min': 'El apellido debe tener al menos 3 caracteres.',
        'any.required': 'El campo apellido es obligatorio.'
    }),
    email: Joi.string().email().when('isInvited', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'string.email': 'El correo electrónico no es válido.',
        'string.empty': 'El correo electrónico es obligatorio.',
        'any.required': 'El campo correo electrónico es obligatorio.'
    }),
    phone: Joi.string().required().messages({
        'string.empty': 'El teléfono es obligatorio.',
        'any.required': 'El campo teléfono es obligatorio.'
    }),
    code: Joi.string().required().messages({
        'string.empty': 'El código es obligatorio.',
        'any.required': 'El campo código es obligatorio.'
    }),
    countryId: Joi.number().integer().required().messages({
        'number.base': 'El ID de país debe ser un número.',
        'any.required': 'El país es obligatorio.'
    }),
    password: Joi.string().pattern(new RegExp('^(?=.*[A-Z])(?=.*\\d)[A-Za-z\\d]{8,}$')).when('isInvited', {
        is: true,
        then: Joi.optional(),
        otherwise: Joi.required()
    }).messages({
        'string.pattern.base': 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.',
        'string.empty': 'La contraseña es obligatoria.',
        'any.required': 'El campo contraseña es obligatorio.'
    }),
    document_number: Joi.string().when('isInvited', {
        is: true,
        then: Joi.required(),
        otherwise: Joi.optional()
    }).messages({
        'any.required': 'El número de documento es obligatorio para invitados.'
    }),
    document_type: Joi.string().valid('IDENTITY_CARD', 'PASSPORT', 'FOREIGN_CARD', 'OTHER').optional(),
    isInvited: Joi.boolean().optional()
})

class UserDto {
    static toCreatedUser(user) {
        const person = user.person || {};
        const country = person.country || {};

        return {
            user_id: user.user_id,
            name: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: person.phone || user.phone || '',
            country_id: person.country_id || null,
            country: country.country || '',
            iso_country: country.iso_country || '',
            iso_currency: country.iso_currency || '',
            currency_simbol: country.currency_simbol || '',
            created_at: user.created_at,
            updated_at: user.updated_at
        }
    }

    static toAuthUser(user) {
        const person = user.person || {};
        const country = person.country || {};

        return {
            user_id: user.user_id,
            nombres: user.first_name,
            apellidos: user.last_name,
            email: user.email,
            phone: person.phone || user.phone || '', 
            country_id: person.country_id || null,
            country: country.country || '',
            iso_country: country.iso_country || '',
            iso_currency: country.iso_currency || '',
            currency_simbol: country.currency_simbol || '',
            avatar_url: user.avatar_url,
            social_provider: user.social_provider,
            created_at: user.created_at,
            updated_at: user.updated_at
        }
    }

    static toLoginResponse(loginResult) {
        return {
            token: loginResult.token,
            user: this.toAuthUser(loginResult.user),
            role: loginResult.role || '',
            roles: loginResult.roles || [],
            permissions: loginResult.permissions || []
        }
    }

    static toSocialLoginResponse(loginResult) {
        return {
            token: loginResult.token,
            user: this.toAuthUser(loginResult.user),
            role: loginResult.role || '',
            roles: loginResult.roles || [],
            permissions: loginResult.permissions || []
        }
    }

    static toAdminLoginResponse(loginResult) {
        return {
            token: loginResult.token,
            user: this.toAuthUser(loginResult.user),
            role: loginResult.role || '',
            roles: loginResult.roles || [],
            permissions: loginResult.permissions || [],
            company_ids: loginResult.company_ids || [],
            tenant_id: loginResult.tenant_id || null
        }
    }

    static toUserResponse(user) {
        const primaryRole = user.roles?.[0] || {};
        return {
            user_id: user.user_id,
            name: user.first_name,
            lastName: user.last_name,
            email: user.email,
            phone: user.person?.phone || user.phone || '',
            document_number: user.person?.document_number || '',
            document_type: user.person?.document_type || null,
            avatar_url: user.avatar_url,
            status: user.is_enabled ? 'Activo' : 'Inactivo',
            social_provider: user.social_provider,
            created_at: user.created_at,
            updated_at: user.updated_at,
            role_id: primaryRole.role_id,
            role_name: primaryRole.role_name
        }
    }
}

const createAdminUserDto = Joi.object({
    first_name: Joi.string().min(2).required().messages({
        'string.empty': 'El nombre es obligatorio.',
        'string.min': 'El nombre debe tener al menos 2 caracteres.',
        'any.required': 'El nombre es obligatorio.'
    }),
    last_name: Joi.string().min(2).required().messages({
        'string.empty': 'El apellido es obligatorio.',
        'string.min': 'El apellido debe tener al menos 2 caracteres.',
        'any.required': 'El apellido es obligatorio.'
    }),
    email: Joi.string().email().required().messages({
        'string.email': 'El correo no es válido.',
        'string.empty': 'El correo es obligatorio.',
        'any.required': 'El correo es obligatorio.'
    }),
    password: Joi.string().pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)[A-Za-z\d]{8,}$/).required().messages({
        'string.pattern.base': 'La contraseña debe tener al menos 8 caracteres, una mayúscula, una minúscula y un número.',
        'string.empty': 'La contraseña es obligatoria.',
        'any.required': 'La contraseña es obligatoria.'
    }),
    role: Joi.string().valid('super_admin', 'administrador', 'empleado').required().messages({
        'any.only': 'Rol no válido. Debe ser super_admin, administrador o empleado.',
        'any.required': 'El rol es obligatorio.'
    }),
    company_id: Joi.number().integer().required().messages({
        'number.base': 'El ID de empresa/sucursal debe ser un número.',
        'any.required': 'El ID de empresa/sucursal es obligatorio.'
    }),
    // Datos de identidad — requeridos para super_admin, opcionales para otros roles
    phone: Joi.string().max(20).when('role', {
        is: 'super_admin',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }).messages({
        'string.empty': 'El teléfono es obligatorio para el propietario.',
        'any.required': 'El teléfono es obligatorio para el propietario.'
    }),
    document_type: Joi.string().valid('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER').when('role', {
        is: 'super_admin',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }).messages({
        'any.only': 'Tipo de documento no válido.',
        'any.required': 'El tipo de documento es obligatorio para el propietario.'
    }),
    document_number: Joi.string().max(50).when('role', {
        is: 'super_admin',
        then: Joi.required(),
        otherwise: Joi.optional().allow('', null)
    }).messages({
        'string.empty': 'El número de documento es obligatorio para el propietario.',
        'any.required': 'El número de documento es obligatorio para el propietario.'
    }),
    country_id: Joi.number().integer().when('role', {
        is: 'super_admin',
        then: Joi.required(),
        otherwise: Joi.optional().allow(null)
    }).messages({
        'number.base': 'El país debe ser un número.',
        'any.required': 'El país es obligatorio para el propietario.'
    }),
    address:    Joi.string().max(255).optional().allow('', null),
    date_birth: Joi.date().iso().max('now').optional().allow(null).messages({
        'date.max': 'La fecha de nacimiento no puede ser futura.',
        'date.iso': 'Formato de fecha inválido. Use YYYY-MM-DD.'
    })
});

const updateStaffUserDto = Joi.object({
    first_name:      Joi.string().min(2).optional().messages({ 'string.min': 'El nombre debe tener al menos 2 caracteres.' }),
    last_name:       Joi.string().min(2).optional().messages({ 'string.min': 'El apellido debe tener al menos 2 caracteres.' }),
    email:           Joi.string().email().optional().messages({ 'string.email': 'El correo no es válido.' }),
    phone:           Joi.string().max(20).optional().allow('', null),
    document_type:   Joi.string().valid('IDENTITY_CARD', 'PASSPORT', 'LICENSE', 'OTHER').optional().allow('', null),
    document_number: Joi.string().max(50).optional().allow('', null),
    country_id:      Joi.number().integer().optional().allow(null),
    address:         Joi.string().max(255).optional().allow('', null),
    date_birth:      Joi.date().iso().max('now').optional().allow(null).messages({
        'date.max': 'La fecha de nacimiento no puede ser futura.',
        'date.iso': 'Formato de fecha inválido. Use YYYY-MM-DD.'
    }),
}).min(1).messages({
    'object.min': 'Debe enviar al menos un campo para actualizar.'
});

const staffOverviewQueryDto = Joi.object({
    role:      Joi.string().valid('super_admin', 'administrador').optional(),
    companyId: Joi.number().integer().optional(),
    search:    Joi.string().optional().allow(''),
    page:      Joi.number().integer().min(1).default(1),
    limit:     Joi.number().integer().min(1).max(100).default(20)
});

// Añadir al UserDto
const personFields = (user) => {
    const p = user.person || {};
    return {
        phone:           p.phone           || null,
        document_type:   p.document_type   || null,
        document_number: p.document_number || null,
        address:         p.address         || null,
        date_birth:      p.date_birth      || null,
        country_id:      p.country_id      || null,
        country_name:    p.country?.country     || null,
        country_iso:     p.country?.iso_country || null,
    };
};

UserDto.toCompanyUserResponse = function(assignment) {
    const user = assignment.user || {};
    return {
        user_company_id: assignment.user_company_id,
        user_id:         user.user_id,
        first_name:      user.first_name,
        last_name:       user.last_name,
        email:           user.email,
        is_enabled:      user.is_enabled,
        role_id:         assignment.role?.role_id,
        role_name:       assignment.role?.role_name,
        company_id:      assignment.company_id,
        company_name:    assignment.company_name || null,
        assigned_at:     assignment.created_at,
        ...personFields(user),
    };
};

UserDto.toStaffItem = function(assignment) {
    const user = assignment.user || {};
    return {
        user_company_id: assignment.user_company_id,
        user_id:         user.user_id,
        first_name:      user.first_name,
        last_name:       user.last_name,
        email:           user.email,
        is_enabled:      user.is_enabled,
        created_at:      user.created_at,
        role_id:         assignment.role?.role_id,
        role_name:       assignment.role?.role_name,
        company_id:      assignment.company_id,
        company_name:    assignment.company?.name || null,
        tenant_id:       assignment.company?.tenant_id || null,
        ...personFields(user),
    };
};

module.exports = {
    createUserDto,
    createAdminUserDto,
    updateStaffUserDto,
    staffOverviewQueryDto,
    UserDto
}
