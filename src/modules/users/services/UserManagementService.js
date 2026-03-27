const UserManagementRepository = require('../repository/UserManagementRepository');
const { NotFoundError, ValidationError, ForbiddenError } = require('../../../shared/errors/CustomErrors');
const { User } = require('../models');

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const getAllPermissions = async () => {
    const perms = await UserManagementRepository.findAllPermissions();
    const grouped = perms.reduce((acc, p) => {
        if (!acc[p.module]) acc[p.module] = [];
        acc[p.module].push(p);
        return acc;
    }, {});
    return { permissions: perms, grouped };
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────────────────

const getAllRoles = async () => {
    return UserManagementRepository.findAllRoles();
};

const updateRolePermissions = async (roleId, permissionKeys, requestingUser) => {
    if (!requestingUser.permissions?.includes('system.full_access')) {
        throw new ForbiddenError('Solo el rol system puede modificar permisos de roles');
    }

    const role = await UserManagementRepository.findRoleById(roleId);
    if (!role) throw new NotFoundError(`Rol con ID ${roleId} no encontrado`);

    if (role.role_name === 'system') {
        throw new ForbiddenError('Los permisos del rol system no se pueden modificar desde la UI');
    }

    if (!Array.isArray(permissionKeys)) {
        throw new ValidationError('permissionKeys debe ser un array de claves de permisos');
    }

    return UserManagementRepository.updateRolePermissions(roleId, permissionKeys);
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS
// ─────────────────────────────────────────────────────────────────────────────

const getUsers = async ({ page, limit, search, roleFilter, companyId }, requestingUser) => {
    const roles   = requestingUser.roles || [];
    const isSystem     = roles.includes('system');
    const isSuperAdmin = roles.includes('super_admin');

    let effectiveCompanyId = companyId || null;
    let effectiveTenantId  = null;

    if (isSystem) {
        // system ve todo — sin filtros adicionales
    } else if (isSuperAdmin) {
        // super_admin ve solo su tenant
        effectiveTenantId = requestingUser.tenant_id || null;
    } else {
        // administrador / empleado ven solo su sucursal
        const [firstCompany] = requestingUser.company_ids || [];
        effectiveCompanyId = companyId || firstCompany || null;
    }

    return UserManagementRepository.findUsers({
        page, limit, search, roleFilter,
        companyId: effectiveCompanyId,
        tenantId:  effectiveTenantId,
    });
};

const getUserDetail = async (userId) => {
    const user = await UserManagementRepository.findUserById(userId);
    if (!user) throw new NotFoundError(`Usuario con ID ${userId} no encontrado`);
    return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// USER PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

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

const getMenuForUser = async (userPermissions) => {
    const items = await UserManagementRepository.findMenuForUser(userPermissions);
    const grouped = items.reduce((acc, item) => {
        const group = item.group_title || 'GENERAL';
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
    }, {});
    return { items, grouped };
};

module.exports = {
    getAllPermissions,
    getAllRoles,
    updateRolePermissions,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenuForUser,
};
