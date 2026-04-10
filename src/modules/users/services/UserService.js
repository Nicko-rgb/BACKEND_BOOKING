/**
 * UserService — Lógica de negocio de usuarios y autenticación.
 *
 * Con la migración de RBAC a permisos directos:
 * - Los tokens ya no incluyen array `roles[]`, solo `role` (string varchar)
 * - Los permisos efectivos vienen de dsg_bss_user_permissions (getUserPermissions)
 * - Los checks de acceso usan user.role string en lugar de roles.includes(...)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const userRepository = require('../repository/UserRepository');
const CompanyRepository = require('../../facility/repository/CompanyRepository');
const redisClient = require('../../../config/redisConfig');
const { ConflictError, NotFoundError, UnauthorizedError, BadRequestError, ForbiddenError } = require('../../../shared/errors/CustomErrors');

// Roles que pueden acceder al módulo administrador ────────────────────────────
const ADMIN_APP_ROLES = ['system', 'super_admin', 'administrador', 'empleado'];
// Roles que se pueden registrar desde la UI (no se puede crear system) ────────
const REGISTERABLE_ROLES = ['super_admin', 'administrador', 'empleado'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Verifica que la contraseña plana coincide con el hash almacenado.
 * Lanza BadRequestError para usuarios de red social sin contraseña.
 */
const verifyPassword = async (user, password) => {
    if (!user.password) {
        throw new BadRequestError('Este usuario se registró con una red social (Google/Apple). Por favor inicie sesión con esa red social.');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedError('Contraseña incorrecta.');
};

/**
 * Genera el token JWT para el portal de reservas (clientes).
 * - Incluye `jti` para revocación por blacklist en Redis al hacer logout.
 * - `role` es string varchar (no array) — todos los accesos van por permissions[].
 * @param {Object} user
 * @param {string[]} permissions - Permisos directos del usuario
 * @returns {string} JWT firmado
 */
const buildBookingToken = (user, permissions) =>
    jwt.sign(
        {
            jti:         randomUUID(),    // ID único del token — permite revocación individual
            user_id:     user.user_id,
            name:        user.first_name,
            email:       user.email,
            role:        user.role || 'cliente',  // clasificador de display
            permissions,
            app:         'booking'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
    );

/**
 * Genera el token JWT para el módulo administrador.
 * - Incluye `jti` para revocación por blacklist en Redis al hacer logout.
 * - `role` es string varchar — todos los accesos van por permissions[].
 * @param {Object} user
 * @param {string[]} permissions - Permisos directos del usuario
 * @param {number[]} company_ids - IDs de empresas/sucursales accesibles
 * @param {string|null} tenant_id
 * @returns {string} JWT firmado
 */
const buildAdminToken = (user, permissions, company_ids, tenant_id) =>
    jwt.sign(
        {
            jti:         randomUUID(),    // ID único del token — permite revocación individual
            user_id:     user.user_id,
            name:        user.first_name,
            email:       user.email,
            role:        user.role,       // clasificador de display
            permissions,
            app:         'admin',
            company_ids, // IDs de empresas/sucursales a las que tiene acceso
            tenant_id    // tenant de su empresa raíz (null para system)
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
    );

/**
 * Invalida el token actual agregando su jti a la blacklist de Redis.
 * El TTL del registro coincide con el tiempo restante del token → limpieza automática.
 * @param {string} token - Bearer token del request de logout
 */
const logoutUser = async (token) => {
    const decoded = jwt.decode(token);
    // Tokens sin jti (tokens legacy) no se pueden revocar — fallo silencioso ─
    if (!decoded?.jti || !decoded?.exp) return;

    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttlSeconds > 0) {
        await redisClient.set(`blacklist:${decoded.jti}`, '1', ttlSeconds);
    }
};

// ─── Registro de usuario (portal Booking Sport) ──────────────────────────────

/**
 * Crea un nuevo usuario cliente en el portal de reservas.
 * Si es invitado y ya existe, solo actualiza sus datos de contacto.
 */
const createNewUser = async (userData) => {
    const { name, lastName, phone, code, email, password, isInvited, document_number, document_type, countryId, roleName = 'cliente' } = userData;

    // Email sintético para invitados — dominio válido para pasar validaciones de formato
    const finalEmail = (isInvited && !email) ? `inv.${document_number}@invitado.com` : email;

    const exists = await userRepository.findUserByEmail(finalEmail);
    if (exists) {
        if (isInvited) {
            // Invitado ya existe — solo actualizar datos de contacto ─────────
            await userRepository.updateUser(exists.user_id, {
                phone:      code + ' ' + phone,
                country_id: countryId
            });
            return await userRepository.getUserById(exists.user_id);
        }
        throw new ConflictError('Ya existe un usuario con ese correo.');
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await userRepository.createUserWithPermissions({
        first_name: name,
        last_name:  lastName,
        email:      finalEmail,
        phone:      (code && phone) ? code + ' ' + phone : phone,
        country_id: countryId,
        password:   hashedPassword,
        ...(isInvited && document_number && {
            document_number,
            document_type: document_type || 'IDENTITY_CARD'
        })
    }, roleName);

    const permissions = await userRepository.getUserPermissions(newUser.user_id);
    const token       = buildBookingToken(newUser, permissions);

    return { token, user: newUser, role: newUser.role, permissions };
};

// ─── Login portal Booking Sport (solo clientes) ──────────────────────────────

/**
 * Autentica un usuario en el portal de reservas.
 * Solo usuarios con role='cliente' tienen acceso.
 */
const loginUser = async (loginData) => {
    const { email, password } = loginData;

    const user = await userRepository.findUserByEmail(email);
    if (!user) throw new NotFoundError('Correo no encontrado.');

    await verifyPassword(user, password);

    // Solo clientes pueden ingresar al portal de reservas ─────────────────────
    if (user.role !== 'cliente') {
        throw new ForbiddenError('Esta cuenta no tiene acceso al portal de reservas. Usa el módulo administrador.');
    }

    const permissions = await userRepository.getUserPermissions(user.user_id);
    const token       = buildBookingToken(user, permissions);

    return { token, user, role: user.role, permissions };
};

// ─── Login módulo administrador ───────────────────────────────────────────────

/**
 * Autentica un usuario en el módulo administrador.
 * Solo roles de ADMIN_APP_ROLES tienen acceso.
 */
const loginAdmin = async (loginData) => {
    const { email, password } = loginData;

    const user = await userRepository.findUserByEmail(email);
    if (!user) throw new NotFoundError('Correo no encontrado.');

    await verifyPassword(user, password);

    // Solo roles del módulo admin pueden ingresar ─────────────────────────────
    if (!ADMIN_APP_ROLES.includes(user.role)) {
        throw new ForbiddenError('Esta cuenta no tiene acceso al módulo administrador.');
    }

    const permissions                   = await userRepository.getUserPermissions(user.user_id);
    const { company_ids, tenant_id }    = await userRepository.getUserCompanyAccess(user.user_id);
    const token                         = buildAdminToken(user, permissions, company_ids, tenant_id);

    return { token, user, role: user.role, permissions, company_ids, tenant_id };
};

// ─── Autenticación social (Google, Apple) — solo portal Booking Sport ─────────

/**
 * Login/registro con proveedor social.
 * Si el usuario no existe, lo crea como cliente con permisos por defecto.
 */
const socialLogin = async (socialData) => {
    const { provider, socialId, email, name, lastName, avatar, countryId } = socialData;

    if (!email) throw new BadRequestError('Email es requerido para la autenticación social');

    let user = await userRepository.findUserBySocialIdOrEmail(socialId, email);

    if (user) {
        // Actualizar datos del proveedor social si cambiaron ──────────────────
        if (!user.social_id || user.avatar_url !== avatar) {
            await userRepository.updateUser(user.user_id, {
                social_id:       socialId  || user.social_id,
                social_provider: provider  || user.social_provider,
                avatar_url:      avatar    || user.avatar_url
            });
            user = await userRepository.getUserById(user.user_id);
        }
    } else {
        // Crear nuevo usuario cliente ──────────────────────────────────────────
        user = await userRepository.createUserWithPermissions({
            first_name:      name     || 'Usuario',
            last_name:       lastName || 'Social',
            email,
            social_id:       socialId,
            social_provider: provider,
            avatar_url:      avatar,
            country_id:      countryId,
            is_enabled:      true
        }, 'cliente');
    }

    const permissions = await userRepository.getUserPermissions(user.user_id);
    const token       = buildBookingToken(user, permissions);

    return { token, user, role: user.role, permissions };
};

// ─── Obtener todos los usuarios (system) ─────────────────────────────────────

/** Devuelve lista paginada de usuarios con filtros. */
const getAllUsers = async (filters = {}) => {
    return await userRepository.getAllUsers(filters);
};

// ─── Registrar usuario admin (super_admin / administrador / empleado) ─────────

/**
 * Registra un usuario en el módulo administrador y lo vincula a una empresa.
 * Valida jerarquía de creación: creator.role controla qué roles puede crear.
 * @param {Object} userData
 * @param {string} creatorRole - role (varchar) del usuario que crea
 * @param {number} creatorId
 */
const registerAdminUser = async (userData, creatorRole = '', creatorId) => {
    const {
        first_name, last_name, email, password, role, company_id,
        phone, document_type, document_number, country_id, address, date_birth
    } = userData;

    if (!REGISTERABLE_ROLES.includes(role)) {
        throw new BadRequestError('Rol no válido para registro');
    }

    // administrador solo puede crear empleados ─────────────────────────────────
    if (creatorRole === 'administrador') {
        if (role !== 'empleado') {
            throw new ForbiddenError('Los administradores solo pueden registrar empleados');
        }
    }

    // super_admin solo puede crear administrador y empleado ────────────────────
    if (creatorRole === 'super_admin') {
        if (!['administrador', 'empleado'].includes(role)) {
            throw new ForbiddenError('Solo puedes registrar administradores y empleados');
        }
    }

    const exists = await userRepository.findUserByEmail(email);
    if (exists) throw new ConflictError('Ya existe un usuario con ese correo');

    const company = await CompanyRepository.findById(company_id);
    if (!company) throw new NotFoundError('La empresa o sucursal especificada no existe');

    // Validar unicidad por rol y empresa/sucursal ─────────────────────────────
    if (role === 'super_admin') {
        const count = await userRepository.countStaffByRoleForCompany(company_id, 'super_admin');
        if (count > 0) throw new ConflictError('Esta empresa ya tiene un propietario (super_admin) asignado');
    } else if (role === 'administrador') {
        const count = await userRepository.countStaffByRoleForCompany(company_id, 'administrador');
        if (count > 0) throw new ConflictError('Esta sucursal ya tiene un administrador asignado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario — createUserWithPermissions asigna role y permisos por defecto
    const newUser = await userRepository.createUserWithPermissions({
        first_name,
        last_name,
        email,
        password:    hashedPassword,
        is_enabled:  true,
        user_create: creatorId,
        phone,
        document_type,
        document_number,
        country_id,
        address,
        date_birth,
    }, role);

    // Vincular al company/sucursal con su tenant ───────────────────────────────
    await userRepository.assignUserToCompany(
        newUser.user_id, company_id, role, company.tenant_id, creatorId
    );

    return newUser;
};

// ─── Getters de staff ─────────────────────────────────────────────────────────

/** Usuarios de una empresa/sucursal específica. */
const getUsersByCompany = async (companyId) => {
    return await userRepository.getUsersByCompany(companyId);
};

/** Todo el staff del tenant (admins + empleados de todas sus sucursales). */
const getTenantStaff = async (companyId) => {
    return await userRepository.getTenantStaff(companyId);
};

/** Visión global del staff (para system). */
const getStaffOverview = async (filters) => {
    return await userRepository.getStaffOverview(filters);
};

/** Actualizar datos básicos de un usuario staff. */
const updateStaffUser = async (userId, data) => {
    const user = await userRepository.updateStaffUser(userId, data);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
};

module.exports = {
    createNewUser,
    loginUser,
    loginAdmin,
    socialLogin,
    getAllUsers,
    registerAdminUser,
    getUsersByCompany,
    getTenantStaff,
    getStaffOverview,
    updateStaffUser,
    logoutUser,
};
