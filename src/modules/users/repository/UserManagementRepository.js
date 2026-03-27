const { Op, Sequelize } = require('sequelize');
const { Permission, RolePermission, Role, MenuItem, Country } = require('../../catalogs/models');
const { User, UserRole, UserPermission, UserCompany, Person } = require('../models');
const { Company } = require('../../facility/models');

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

const findAllPermissions = async () => {
    return Permission.findAll({
        order: [['module', 'ASC'], ['key', 'ASC']],
        raw: true,
    });
};

// ─────────────────────────────────────────────────────────────────────────────
// ROLES
// ─────────────────────────────────────────────────────────────────────────────

const findAllRoles = async () => {
    const roles = await Role.findAll({
        include: [{
            model: RolePermission,
            as: 'rolePermissions',
            attributes: ['permission_key'],
        }],
        order: [['role_id', 'ASC']],
    });
    return roles.map(r => ({
        ...r.toJSON(),
        permissionKeys: r.rolePermissions.map(rp => rp.permission_key),
    }));
};

const updateRolePermissions = async (roleId, permissionKeys) => {
    const role = await Role.findByPk(roleId);
    if (!role) return null;

    await RolePermission.destroy({ where: { role_id: roleId } });

    if (permissionKeys.length > 0) {
        await RolePermission.bulkCreate(
            permissionKeys.map(key => ({ role_id: roleId, permission_key: key })),
            { ignoreDuplicates: true }
        );
    }

    return findRoleById(roleId);
};

const findRoleById = async (roleId) => {
    const role = await Role.findByPk(roleId, {
        include: [{ model: RolePermission, as: 'rolePermissions', attributes: ['permission_key'] }],
    });
    if (!role) return null;
    return { ...role.toJSON(), permissionKeys: role.rolePermissions.map(rp => rp.permission_key) };
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS — lista con filtros + stats globales
// ─────────────────────────────────────────────────────────────────────────────

const formatUser = (user) => {
    const u = user.toJSON ? user.toJSON() : user;
    return {
        user_id:       u.user_id,
        first_name:    u.first_name,
        last_name:     u.last_name,
        email:         u.email,
        is_enabled:    u.is_enabled,
        created_at:    u.created_at,
        phone:         u.person?.phone || null,
        country: u.person?.country
            ? { name: u.person.country.country, flag: u.person.country.flag_url }
            : null,
        roles: (u.roles || []).map(r => r.role_name).filter(Boolean),
        companyAssignments: (u.companyAssignments || []).map(ca => ({
            user_company_id: ca.user_company_id,
            company_id:      ca.company_id,
            company_name:    ca.company?.name,
            is_subsidiary:   !!ca.company?.parent_company_id,
            role_id:         ca.role_id,
            role_name:       ca.role?.role_name,
            is_active:       ca.is_active,
        })),
        directPermissions: (u.directPermissions || []).map(p => p.permission_key),
    };
};

const findUsers = async ({
    page = 1, limit = 20, search = '',
    roleFilter = '', companyId = null, tenantId = null,
} = {}) => {
    const offset = (page - 1) * limit;

    const userWhere = {};
    if (search) {
        userWhere[Op.or] = [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name:  { [Op.iLike]: `%${search}%` } },
            { email:      { [Op.iLike]: `%${search}%` } },
        ];
    }

    const companyAssignmentWhere = { is_active: true };
    if (companyId) companyAssignmentWhere.company_id = companyId;
    if (tenantId)  companyAssignmentWhere.tenant_id  = tenantId;

    const requiresCompanyJoin = !!(companyId || tenantId);

    // Includes solo para el COUNT (solo JOINs requeridos para filtrar)
    const countIncludes = [];
    if (roleFilter) {
        countIncludes.push({
            model: Role,
            as: 'roles',
            attributes: [],
            through: { attributes: [] },
            where: { role_name: roleFilter },
            required: true,
        });
    }
    if (requiresCompanyJoin) {
        countIncludes.push({
            model: UserCompany,
            as: 'companyAssignments',
            where: companyAssignmentWhere,
            required: true,
            attributes: [],
        });
    }

    // Includes completos para el SELECT (con datos para mostrar)
    const rowIncludes = [
        {
            model: Role,
            as: 'roles',
            attributes: ['role_id', 'role_name', 'app_access'],
            through: { attributes: [] },
            where: roleFilter ? { role_name: roleFilter } : undefined,
            required: !!roleFilter,
        },
        {
            model: UserCompany,
            as: 'companyAssignments',
            where: companyAssignmentWhere,
            required: requiresCompanyJoin,
            include: [
                { model: Company, as: 'company', attributes: ['company_id', 'name', 'parent_company_id'] },
                { model: Role,    as: 'role',    attributes: ['role_id', 'role_name'] },
            ],
        },
        {
            model: Person, as: 'person', attributes: ['phone'], required: false,
            include: [{ model: Country, as: 'country', attributes: ['country', 'flag_url'], required: false }],
        },
        { model: UserPermission, as: 'directPermissions', attributes: ['permission_key'], required: false },
    ];

    // COUNT separado del SELECT para evitar el subquery issue de Sequelize
    const [count, rows] = await Promise.all([
        User.count({ where: userWhere, include: countIncludes, distinct: true, col: 'user_id' }),
        User.findAll({ where: userWhere, include: rowIncludes, limit, offset, order: [['created_at', 'DESC']] }),
    ]);

    // Estadísticas globales (sin filtros de página)
    const [totalAll, roleStats] = await Promise.all([
        User.count(),
        UserRole.findAll({
            attributes: [
                [Sequelize.fn('COUNT', Sequelize.col('UserRole.user_id')), 'count'],
                [Sequelize.col('role.role_name'), 'role_name'],
            ],
            include: [{ model: Role, as: 'role', attributes: [] }],
            group: ['role.role_name'],
            raw: true,
        }),
    ]);

    const stats = {
        totalUsers: totalAll,
        byRole: { cliente: 0, empleado: 0, administrador: 0, super_admin: 0, system: 0 },
    };
    roleStats.forEach(item => {
        const name = item['role.role_name'] || item['role_name'];
        if (Object.prototype.hasOwnProperty.call(stats.byRole, name)) {
            stats.byRole[name] = parseInt(item.count, 10);
        }
    });

    return {
        users: rows.map(formatUser),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
        stats,
    };
};

const findUserById = async (userId) => {
    const user = await User.findByPk(userId, {
        include: [
            {
                model: Role,
                as: 'roles',
                attributes: ['role_id', 'role_name', 'app_access'],
                through: { attributes: [] },
                required: false,
            },
            {
                model: UserCompany,
                as: 'companyAssignments',
                where: { is_active: true },
                required: false,
                include: [
                    { model: Company, as: 'company', attributes: ['company_id', 'name', 'parent_company_id'] },
                    { model: Role,    as: 'role',    attributes: ['role_id', 'role_name'] },
                ],
            },
            {
                model: Person, as: 'person', attributes: ['phone', 'document_type', 'document_number'], required: false,
                include: [{ model: Country, as: 'country', attributes: ['country', 'flag_url'], required: false }],
            },
            {
                model: UserPermission,
                as: 'directPermissions',
                attributes: ['permission_key'],
                required: false,
            },
        ],
    });
    if (!user) return null;
    return formatUser(user);
};

// ─────────────────────────────────────────────────────────────────────────────
// USER PERMISSIONS (directos)
// ─────────────────────────────────────────────────────────────────────────────

const setUserDirectPermissions = async (userId, permissionKeys, grantedBy) => {
    await UserPermission.destroy({ where: { user_id: userId } });

    if (permissionKeys.length > 0) {
        await UserPermission.bulkCreate(
            permissionKeys.map(key => ({ user_id: userId, permission_key: key, granted_by: grantedBy })),
            { ignoreDuplicates: true }
        );
    }

    return findUserById(userId);
};

// ─────────────────────────────────────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────────────────────────────────────

const findMenuForUser = async (userPermissions = []) => {
    const isSystem = userPermissions.includes('system.full_access');

    const items = await MenuItem.findAll({
        where: { is_active: true, app_access: { [Op.in]: ['admin', 'both'] } },
        order: [['group_title', 'ASC'], ['sort_order', 'ASC']],
        raw: true,
    });

    return items.filter(item =>
        !item.required_permission ||
        isSystem ||
        userPermissions.includes(item.required_permission)
    );
};

module.exports = {
    // Permissions
    findAllPermissions,
    // Roles
    findAllRoles,
    findRoleById,
    updateRolePermissions,
    // Users
    findUsers,
    findUserById,
    setUserDirectPermissions,
    // Menu
    findMenuForUser,
};
