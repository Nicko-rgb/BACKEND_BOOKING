/**
 * UserManagementRepository — Queries para gestión de usuarios y permisos.
 *
 * Con la migración a permisos directos:
 * - Role, RolePermission, UserRole ya no existen — eliminados los métodos relacionados
 * - User.role y UserCompany.role son VARCHAR clasificadores (display only)
 * - Stats de usuarios usan User.role directamente
 */
const { Op, Sequelize } = require('sequelize');
const { Permission, MenuItem, Country } = require('../../catalogs/models');
const { User, UserPermission, UserCompany, Person } = require('../models');
const { Company } = require('../../facility/models');

// ─────────────────────────────────────────────────────────────────────────────
// PERMISSIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve todos los permisos del catálogo con el conteo de usuarios que los tienen.
 * @returns {Array<{ permission_id, key, label, module, app_access, description, userCount }>}
 */
const findAllPermissions = async () => {
    const perms = await Permission.findAll({
        attributes: [
            'permission_id', 'key', 'label', 'description', 'module', 'app_access', 'created_at',
            // Subconsulta para contar cuántos usuarios tienen este permiso ──────
            [
                Sequelize.literal(`(
                    SELECT COUNT(*)::int
                    FROM dsg_bss_user_permissions up
                    WHERE up.permission_key = "Permission"."key"
                )`),
                'userCount',
            ],
        ],
        order: [['module', 'ASC'], ['key', 'ASC']],
        raw: true,
    });
    return perms;
};

/**
 * Devuelve los usuarios que tienen un permiso específico.
 * @param {string} permissionKey
 * @returns {Array}
 */
const findUsersByPermissionKey = async (permissionKey) => {
    const assignments = await UserPermission.findAll({
        where: { permission_key: permissionKey },
        include: [{
            model: User,
            as:    'user',
            attributes: ['user_id', 'first_name', 'last_name', 'email', 'role', 'is_enabled'],
        }],
    });
    return assignments.map(a => ({
        user_id:    a.user.user_id,
        first_name: a.user.first_name,
        last_name:  a.user.last_name,
        email:      a.user.email,
        role:       a.user.role,
        is_enabled: a.user.is_enabled,
    }));
};

/**
 * Crea un nuevo permiso en el catálogo.
 * @param {{ key, label, description, module, app_access }} data
 * @returns {Object}
 */
const createPermission = async (data) => {
    return Permission.create(data);
};

/**
 * Actualiza label, description y app_access de un permiso existente.
 * La key y el module son inmutables porque son FK lógica en user_permissions.
 * @param {string} key
 * @param {{ label, description, app_access }} data
 * @returns {Object|null}
 */
const updatePermission = async (key, data) => {
    const perm = await Permission.findOne({ where: { key } });
    if (!perm) return null;
    await perm.update(data);
    return perm;
};

// ─────────────────────────────────────────────────────────────────────────────
// USERS — lista con filtros + stats globales
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formatea un usuario para la respuesta de gestión.
 * Usa User.role (varchar) y UserCompany.role (varchar) directamente.
 * @param {Object} user - Instancia de User de Sequelize
 * @returns {Object}
 */
const formatUser = (user) => {
    const u = user.toJSON ? user.toJSON() : user;
    return {
        user_id:       u.user_id,
        first_name:    u.first_name,
        last_name:     u.last_name,
        email:         u.email,
        role:          u.role || null,   // varchar clasificador
        is_enabled:    u.is_enabled,
        created_at:    u.created_at,
        phone:         u.person?.phone || null,
        country: u.person?.country
            ? { name: u.person.country.country, flag: u.person.country.flag_url }
            : null,
        companyAssignments: (u.companyAssignments || []).map(ca => ({
            user_company_id: ca.user_company_id,
            company_id:      ca.company_id,
            company_name:    ca.company?.name,
            is_subsidiary:   !!ca.company?.parent_company_id,
            role:            ca.role || null,   // varchar clasificador
            is_active:       ca.is_active,
        })),
        directPermissions: (u.directPermissions || []).map(p => p.permission_key),
    };
};

/**
 * Busca usuarios con filtros y paginación.
 * Filtro por rol usa User.role varchar directamente.
 * @param {Object} params
 * @returns {{ users, total, page, limit, totalPages, stats }}
 */
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

    // Filtro por tipo de usuario (User.role varchar) ──────────────────────────
    if (roleFilter) {
        userWhere.role = roleFilter;
    }

    const companyAssignmentWhere = { is_active: true };
    if (companyId) companyAssignmentWhere.company_id = companyId;
    if (tenantId)  companyAssignmentWhere.tenant_id  = tenantId;

    const requiresCompanyJoin = !!(companyId || tenantId);

    // Includes completos para el SELECT ────────────────────────────────────────
    const rowIncludes = [
        {
            model:    UserCompany,
            as:       'companyAssignments',
            where:    companyAssignmentWhere,
            required: requiresCompanyJoin,
            include:  [
                { model: Company, as: 'company', attributes: ['company_id', 'name', 'parent_company_id'] },
            ],
        },
        {
            model:    Person,
            as:       'person',
            attributes: ['phone'],
            required: false,
            include:  [{ model: Country, as: 'country', attributes: ['country', 'flag_url'], required: false }],
        },
        { model: UserPermission, as: 'directPermissions', attributes: ['permission_key'], required: false },
    ];

    // COUNT separado del SELECT para evitar el subquery issue de Sequelize ────
    const [count, rows] = await Promise.all([
        User.count({ where: userWhere, include: requiresCompanyJoin ? [rowIncludes[0]] : [], distinct: true, col: 'user_id' }),
        User.findAll({ where: userWhere, include: rowIncludes, limit, offset, order: [['created_at', 'DESC']] }),
    ]);

    // Estadísticas por tipo de usuario usando User.role ───────────────────────
    const [totalAll, roleStats] = await Promise.all([
        User.count(),
        User.findAll({
            attributes: [
                'role',
                [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count'],
            ],
            group: ['role'],
            raw: true,
        }),
    ]);

    const stats = {
        totalUsers: totalAll,
        byRole: { cliente: 0, empleado: 0, administrador: 0, super_admin: 0, system: 0 },
    };
    roleStats.forEach(item => {
        const name = item.role;
        if (name && Object.prototype.hasOwnProperty.call(stats.byRole, name)) {
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

/**
 * Busca un usuario por ID con todas sus asignaciones y permisos directos.
 * @param {number} userId
 * @returns {Object|null}
 */
const findUserById = async (userId) => {
    const user = await User.findByPk(userId, {
        include: [
            {
                model:    UserCompany,
                as:       'companyAssignments',
                where:    { is_active: true },
                required: false,
                include:  [
                    { model: Company, as: 'company', attributes: ['company_id', 'name', 'parent_company_id'] },
                ],
            },
            {
                model:      Person,
                as:         'person',
                attributes: ['phone', 'document_type', 'document_number'],
                required:   false,
                include:    [{ model: Country, as: 'country', attributes: ['country', 'flag_url'], required: false }],
            },
            {
                model:      UserPermission,
                as:         'directPermissions',
                attributes: ['permission_key'],
                required:   false,
            },
        ],
    });
    if (!user) return null;
    return formatUser(user);
};

// ─────────────────────────────────────────────────────────────────────────────
// USER PERMISSIONS (directos)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reemplaza todos los permisos directos de un usuario con el nuevo set.
 * @param {number} userId
 * @param {string[]} permissionKeys
 * @param {number} grantedBy
 * @returns {Object} Usuario actualizado
 */
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

/**
 * Devuelve los ítems de menú visibles para el usuario según sus permisos.
 * @param {string[]} userPermissions
 * @returns {Object[]}
 */
const findMenuForUser = async (userPermissions = []) => {
    const isSystem = userPermissions.includes('system.full_access');

    const items = await MenuItem.findAll({
        where: { is_active: true, app_access: { [Op.in]: ['admin', 'both'] } },
        order: [['group_title', 'ASC'], ['sort_order', 'ASC']],
        raw: true,
    });

    // Filtrar por permiso requerido del item — system bypasea todo ─────────────
    return items.filter(item =>
        !item.required_permission ||
        isSystem ||
        userPermissions.includes(item.required_permission)
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OWNER ASSIGNMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Busca el registro activo de propietario (role = 'super_admin') de una empresa.
 * @param {number} companyId — ID de empresa principal
 * @returns {UserCompany|null}
 */
const findOwnerByCompany = async (companyId) => {
    return UserCompany.findOne({
        where: { company_id: companyId, role: 'super_admin', is_active: true },
    });
};

/**
 * Crea un registro en UserCompany asignando el usuario a la empresa como propietario.
 * @param {number} userId
 * @param {number} companyId
 * @param {string} tenantId
 * @param {number} createdBy
 * @returns {UserCompany}
 */
const assignOwnerToCompany = async (userId, companyId, tenantId, createdBy) => {
    return UserCompany.create({
        user_id:    userId,
        company_id: companyId,
        role:       'super_admin',
        tenant_id:  tenantId,
        is_active:  true,
        created_by: createdBy,
    });
};

module.exports = {
    findAllPermissions,
    findUsersByPermissionKey,
    createPermission,
    updatePermission,
    findUsers,
    findUserById,
    setUserDirectPermissions,
    findMenuForUser,
    findOwnerByCompany,
    assignOwnerToCompany,
};
