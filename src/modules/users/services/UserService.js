// /modules/users/services/UserService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repository/UserRepository');
const CompanyRepository = require('../../facility/repository/CompanyRepository');
const { ConflictError, NotFoundError, UnauthorizedError, BadRequestError, ForbiddenError } = require('../../../shared/errors/CustomErrors');

// Roles permitidos en el módulo administrador
const ADMIN_APP_ROLES = ['system', 'super_admin', 'administrador', 'empleado'];
// Roles que se pueden registrar (no se puede crear system desde la UI)
const REGISTERABLE_ROLES = ['super_admin', 'administrador', 'empleado'];

// ─── helpers ────────────────────────────────────────────────────────────────

const verifyPassword = async (user, password) => {
    if (!user.password) {
        throw new BadRequestError('Este usuario se registró con una red social (Google/Apple). Por favor inicie sesión con esa red social.');
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedError('Contraseña incorrecta.');
};

const buildBookingToken = (user, primaryRole, roles, permissions) =>
    jwt.sign(
        {
            user_id: user.user_id,
            name: user.first_name,
            email: user.email,
            role: primaryRole,
            roles,
            permissions,
            app: 'booking'
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
    );

const buildAdminToken = (user, primaryRole, roles, permissions, company_ids, tenant_id) =>
    jwt.sign(
        {
            user_id: user.user_id,
            name: user.first_name,
            email: user.email,
            role: primaryRole,
            roles,
            permissions,
            app: 'admin',
            company_ids,   // IDs de empresas/sucursales a las que tiene acceso
            tenant_id      // tenant de su empresa raíz (null para system)
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES }
    );

// ─── Registro de usuario (portal Booking Sport) ──────────────────────────────

const createNewUser = async (userData) => {
    const { name, lastName, phone, code, email, password, isInvited, document_number, document_type, countryId, roleName = 'cliente' } = userData;

    // Email sintético para invitados — usa dominio válido para pasar validaciones de formato
    const finalEmail = (isInvited && !email) ? `inv.${document_number}@invitado.com` : email;

    const exists = await userRepository.findUserByEmail(finalEmail);
    if (exists) {
        if (isInvited) {
            await userRepository.updateUser(exists.user_id, {
                phone: code + ' ' + phone,
                country_id: countryId
            });
            return await userRepository.getUserById(exists.user_id);
        }
        throw new ConflictError('Ya existe un usuario con ese correo.');
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await userRepository.createUserWithRole({
        first_name: name,
        last_name: lastName,
        email: finalEmail,
        phone: (code && phone) ? code + ' ' + phone : phone,
        country_id: countryId,
        password: hashedPassword,
        // Para invitados: guardar número y tipo de documento (por defecto IDENTITY_CARD)
        ...(isInvited && document_number && {
            document_number,
            document_type: document_type || 'IDENTITY_CARD'
        })
    }, roleName);

    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(newUser.user_id);
    const primaryRole = roles[0] || '';

    const token = buildBookingToken(newUser, primaryRole, roles, permissions);

    return { token, user: newUser, role: primaryRole, roles, permissions };
};

// ─── Login portal Booking Sport (solo clientes) ──────────────────────────────

const loginUser = async (loginData) => {
    const { email, password } = loginData;

    const user = await userRepository.findUserByEmail(email);
    if (!user) throw new NotFoundError('Correo no encontrado.');

    await verifyPassword(user, password);

    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.user_id);
    const primaryRole = roles[0] || '';

    // Solo clientes pueden ingresar al portal de reservas
    const hasClientRole = roles.includes('cliente');
    if (!hasClientRole) {
        throw new ForbiddenError('Esta cuenta no tiene acceso al portal de reservas. Usa el módulo administrador.');
    }

    const token = buildBookingToken(user, primaryRole, roles, permissions);

    return { token, user, role: primaryRole, roles, permissions };
};

// ─── Login módulo administrador ───────────────────────────────────────────────

const loginAdmin = async (loginData) => {
    const { email, password } = loginData;

    const user = await userRepository.findUserByEmail(email);
    if (!user) throw new NotFoundError('Correo no encontrado.');

    await verifyPassword(user, password);

    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.user_id);
    const primaryRole = roles[0] || '';

    // Solo roles del módulo admin pueden ingresar
    const hasAdminRole = roles.some(r => ADMIN_APP_ROLES.includes(r));
    if (!hasAdminRole) {
        throw new ForbiddenError('Esta cuenta no tiene acceso al módulo administrador.');
    }

    // Obtener empresa/sucursales asignadas y tenant_id
    const { company_ids, tenant_id } = await userRepository.getUserCompanyAccess(user.user_id);

    const token = buildAdminToken(user, primaryRole, roles, permissions, company_ids, tenant_id);

    return { token, user, role: primaryRole, roles, permissions, company_ids, tenant_id };
};

// ─── Autenticación social (Google, Apple) — solo portal Booking Sport ─────────

const socialLogin = async (socialData) => {
    const { provider, socialId, email, name, lastName, avatar, countryId } = socialData;

    if (!email) throw new BadRequestError('Email es requerido para la autenticación social');

    let user = await userRepository.findUserBySocialIdOrEmail(socialId, email);

    if (user) {
        if (!user.social_id || user.avatar_url !== avatar) {
            await userRepository.updateUser(user.user_id, {
                social_id: socialId || user.social_id,
                social_provider: provider || user.social_provider,
                avatar_url: avatar || user.avatar_url
            });
            user = await userRepository.getUserById(user.user_id);
        }
    } else {
        user = await userRepository.createUserWithRole({
            first_name: name || 'Usuario',
            last_name: lastName || 'Social',
            email,
            social_id: socialId,
            social_provider: provider,
            avatar_url: avatar,
            country_id: countryId,
            is_enabled: true
        }, 'cliente');
    }

    const { roles, permissions } = await userRepository.getUserRolesAndPermissions(user.user_id);
    const primaryRole = roles[0] || '';

    const token = buildBookingToken(user, primaryRole, roles, permissions);

    return { token, user, role: primaryRole, roles, permissions };
};

// ─── Obtener todos los usuarios (system) ─────────────────────────────────────

const getAllUsers = async (filters = {}) => {
    return await userRepository.getAllUsers(filters);
};

// ─── Registrar usuario admin (super_admin / administrador / empleado) ─────────

const registerAdminUser = async (userData, creatorRoles = [], creatorId) => {
    const {
        first_name, last_name, email, password, role, company_id,
        phone, document_type, document_number, country_id, address, date_birth
    } = userData;

    if (!REGISTERABLE_ROLES.includes(role)) {
        throw new BadRequestError('Rol no válido para registro');
    }

    // administrador solo puede crear empleados
    if (creatorRoles.includes('administrador') && !creatorRoles.includes('super_admin') && !creatorRoles.includes('system')) {
        if (role !== 'empleado') {
            throw new ForbiddenError('Los administradores solo pueden registrar empleados');
        }
    }

    // super_admin solo puede crear administrador y empleado
    if (creatorRoles.includes('super_admin') && !creatorRoles.includes('system')) {
        if (!['administrador', 'empleado'].includes(role)) {
            throw new ForbiddenError('Solo puedes registrar administradores y empleados');
        }
    }

    const exists = await userRepository.findUserByEmail(email);
    if (exists) throw new ConflictError('Ya existe un usuario con ese correo');

    const company = await CompanyRepository.findById(company_id);
    if (!company) throw new NotFoundError('La empresa o sucursal especificada no existe');

    // Validar unicidad por rol y empresa/sucursal
    if (role === 'super_admin') {
        const count = await userRepository.countStaffByRoleForCompany(company_id, 'super_admin');
        if (count > 0) throw new ConflictError('Esta empresa ya tiene un propietario (super_admin) asignado');
    } else if (role === 'administrador') {
        const count = await userRepository.countStaffByRoleForCompany(company_id, 'administrador');
        if (count > 0) throw new ConflictError('Esta sucursal ya tiene un administrador asignado');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await userRepository.createUserWithRole({
        first_name,
        last_name,
        email,
        password: hashedPassword,
        is_enabled: true,
        user_create: creatorId,
        phone,
        document_type,
        document_number,
        country_id,
        address,
        date_birth,
    }, role);

    // Vincular al company/sucursal — getUserCompanyAccess expande el tenant dinámicamente al login
    await userRepository.assignUserToCompany(
        newUser.user_id, company_id, role, company.tenant_id, creatorId
    );

    return newUser;
};

// ─── Obtener usuarios de una empresa/sucursal ─────────────────────────────────

const getUsersByCompany = async (companyId) => {
    return await userRepository.getUsersByCompany(companyId);
};

// ─── Obtener todo el staff del tenant (admins + empleados de todas sus sucursales) ──

const getTenantStaff = async (companyId) => {
    return await userRepository.getTenantStaff(companyId);
};

// ─── Visión global del staff (system) ────────────────────────────────────────

const getStaffOverview = async (filters) => {
    return await userRepository.getStaffOverview(filters);
};

// ─── Actualizar datos básicos de un usuario staff ─────────────────────────────

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
};
