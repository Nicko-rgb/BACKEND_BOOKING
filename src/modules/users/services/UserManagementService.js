/**
 * UserManagementService — Lógica de negocio para gestión de usuarios y permisos.
 *
 * Los métodos de roles (getAllRoles, updateRolePermissions) fueron eliminados
 * junto con la tabla dsg_bss_roles en la migración a permisos directos.
 */
const UserManagementRepository = require('../repository/UserManagementRepository');
const { NotFoundError, ValidationError, ConflictError, ForbiddenError } = require('../../../shared/errors/CustomErrors');
const { User, UserPermission } = require('../models');
const { Company }    = require('../../facility/models');
const { Permission } = require('../../catalogs/models');
const { DEFAULT_PERMISSIONS } = require('../../catalogs/constants/permissionsConstants');

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve todos los permisos del catálogo como arreglo plano con userCount.
 * @returns {Array}
 */
const getAllPermissions = async () => {
    return UserManagementRepository.findAllPermissions();
};

/**
 * Devuelve los usuarios que tienen asignado un permiso específico.
 * @param {string} permissionKey
 * @returns {Array}
 */
const getUsersByPermission = async (permissionKey) => {
    return UserManagementRepository.findUsersByPermissionKey(permissionKey);
};

/**
 * Crea un nuevo permiso en el catálogo.
 * @param {{ key, label, description, module, app_access }} data
 * @returns {Object}
 */
const createPermission = async (data) => {
    const { key, label, module: mod, app_access, description } = data;
    // Verificar que no exista ya ──────────────────────────────────────────────
    const existing = await Permission.findOne({ where: { key } });
    if (existing) throw new ValidationError(`Ya existe un permiso con la clave '${key}'`);
    return UserManagementRepository.createPermission({ key, label, module: mod, app_access, description: description || null });
};

/**
 * Actualiza un permiso existente (label, description, app_access).
 * @param {string} key
 * @param {{ label, description, app_access }} data
 * @returns {Object}
 */
const updatePermission = async (key, data) => {
    const updated = await UserManagementRepository.updatePermission(key, data);
    if (!updated) throw new NotFoundError(`Permiso '${key}' no encontrado`);
    return updated;
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Lista usuarios con filtros y paginación según el scope del solicitante.
 * Usa requestingUser.role (string varchar) en lugar de roles[].
 * @param {Object} params - Filtros de búsqueda
 * @param {Object} requestingUser - Usuario del JWT decodificado
 * @returns {{ users, total, page, limit, totalPages, stats }}
 */
const getUsers = async ({ page, limit, search, roleFilter, companyId }, requestingUser) => {
    const role = requestingUser.role || '';

    let effectiveCompanyId = companyId || null;
    let effectiveTenantId  = null;

    if (role === 'system') {
        // system ve todo — sin filtros adicionales ────────────────────────────
    } else if (role === 'super_admin') {
        // super_admin ve solo su tenant ───────────────────────────────────────
        effectiveTenantId = requestingUser.tenant_id || null;
    } else {
        // administrador / empleado ven solo su sucursal ───────────────────────
        const [firstCompany] = requestingUser.company_ids || [];
        effectiveCompanyId   = companyId || firstCompany || null;
    }

    return UserManagementRepository.findUsers({
        page, limit, search, roleFilter,
        companyId: effectiveCompanyId,
        tenantId:  effectiveTenantId,
    });
};

/**
 * Devuelve el detalle completo de un usuario por ID.
 * @param {number} userId
 * @returns {Object}
 */
const getUserDetail = async (userId) => {
    const user = await UserManagementRepository.findUserById(userId);
    if (!user) throw new NotFoundError(`Usuario con ID ${userId} no encontrado`);
    return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// USER PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reemplaza los permisos directos de un usuario.
 * Solo usuarios con 'role.manage' pueden llamar a este endpoint (verificado en ruta).
 * @param {number} userId
 * @param {string[]} permissionKeys
 * @param {Object} requestingUser
 * @returns {Object} Usuario actualizado
 */
const setUserDirectPermissions = async (userId, permissionKeys, requestingUser) => {
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError(`Usuario con ID ${userId} no encontrado`);

    if (!Array.isArray(permissionKeys)) {
        throw new ValidationError('permissionKeys debe ser un array');
    }

    return UserManagementRepository.setUserDirectPermissions(userId, permissionKeys, requestingUser.user_id);
};

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve el menú dinámico filtrado según los permisos del usuario.
 * @param {string[]} userPermissions
 * @returns {{ items, grouped }}
 */
const getMenuForUser = async (userPermissions) => {
    const items   = await UserManagementRepository.findMenuForUser(userPermissions);
    const grouped = items.reduce((acc, item) => {
        const group = item.group_title || 'GENERAL';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});
    return { items, grouped };
};

// ─────────────────────────────────────────────────────────────────────────────
// OWNER ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Asigna un usuario super_admin existente como propietario de una empresa principal.
 *
 * Reglas de negocio:
 *  - El usuario debe existir y tener role === 'super_admin'
 *  - La empresa debe existir y ser principal (parent_company_id IS NULL)
 *  - La empresa no puede tener ya un propietario activo asignado
 *  - Se insertan los permisos por defecto de super_admin (ignoreDuplicates: true)
 *
 * @param {number} userId        — ID del usuario a asignar
 * @param {number} companyId     — ID de la empresa principal
 * @param {Object} requestingUser — payload del JWT del solicitante
 * @returns {Object} Registro UserCompany creado
 */
const assignOwnerToCompany = async (userId, companyId, requestingUser) => {
    // Verificar que el usuario existe y es super_admin ────────────────────────
    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError(`Usuario con ID ${userId} no encontrado`);
    if (user.role !== 'super_admin') {
        throw new ValidationError('Solo se puede asignar un usuario con rol super_admin como propietario');
    }

    // Verificar que la empresa existe y es principal ──────────────────────────
    const company = await Company.findByPk(companyId);
    if (!company) throw new NotFoundError(`Empresa con ID ${companyId} no encontrada`);
    if (company.parent_company_id !== null) {
        throw new ValidationError('Solo se puede asignar propietario a una empresa principal, no a una sucursal');
    }

    // Verificar que la empresa no tiene ya un propietario activo ─────────────
    const existingOwner = await UserManagementRepository.findOwnerByCompany(companyId);
    if (existingOwner) {
        throw new ConflictError('Esta empresa ya tiene un propietario asignado');
    }

    // Crear el registro de asignación ─────────────────────────────────────────
    const assignment = await UserManagementRepository.assignOwnerToCompany(
        userId, companyId, company.tenant_id, requestingUser.user_id
    );

    // Insertar permisos por defecto de super_admin (sin duplicar) ────────────
    const defaultPerms = DEFAULT_PERMISSIONS['super_admin'] || [];
    if (defaultPerms.length > 0) {
        await UserPermission.bulkCreate(
            defaultPerms.map(key => ({
                user_id:       userId,
                permission_key: key,
                granted_by:    requestingUser.user_id,
            })),
            { ignoreDuplicates: true }
        );
    }

    return assignment;
};

// ─────────────────────────────────────────────────────────────────────────────
// USER STATUS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Activa o desactiva un usuario (toggle de is_enabled).
 * Reglas:
 *  - No puedes cambiar tu propio estado
 *  - Solo system puede cambiar estado de otro system
 *  - super_admin no puede cambiar estado de system ni de otro super_admin fuera de su tenant
 *
 * @param {number} userId
 * @param {Object} requestingUser — payload del JWT
 * @returns {{ user_id, is_enabled, message }}
 */
const toggleUserStatus = async (userId, requestingUser) => {
    if (userId === requestingUser.user_id) {
        throw new ValidationError('No puedes cambiar tu propio estado');
    }

    const user = await User.findByPk(userId);
    if (!user) throw new NotFoundError(`Usuario con ID ${userId} no encontrado`);

    // Solo system puede actuar sobre otro system ─────────────────────────────
    if (user.role === 'system' && requestingUser.role !== 'system') {
        throw new ForbiddenError('No tienes permiso para cambiar el estado de un usuario system');
    }

    const newStatus = !user.is_enabled;
    await user.update({ is_enabled: newStatus });

    const action = newStatus ? 'activado' : 'desactivado';
    return {
        user_id:    user.user_id,
        is_enabled: newStatus,
        message:    `Usuario ${action} correctamente`,
    };
};

module.exports = {
    getAllPermissions,
    getUsersByPermission,
    createPermission,
    updatePermission,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenuForUser,
    assignOwnerToCompany,
    toggleUserStatus,
};
