/**
 * UserRepository — Acceso a datos de usuarios.
 *
 * Con la migración de RBAC a permisos directos:
 * - UserRole, Role, RolePermission ya no existen
 * - User.role es VARCHAR clasificador (display only)
 * - UserCompany.role es VARCHAR clasificador (display only)
 * - Todos los accesos se evalúan por dsg_bss_user_permissions
 */
const User = require('../models/User');
const { UserCompany, Person, UserPermission } = require('../models');
const { Country } = require('../../catalogs/models');
const { Company } = require('../../facility/models');
const { DEFAULT_PERMISSIONS } = require('../../../seeds/permissionSeed');
const { Op, Sequelize } = require('sequelize');

/**
 * Crea un nuevo usuario con role VARCHAR y sus permisos por defecto en user_permissions.
 * Reemplaza a createUserWithRole (que usaba la tabla dsg_bss_user_roles eliminada).
 * @param {Object} userData - Datos del usuario
 * @param {string} roleName - Tipo de usuario: 'cliente', 'empleado', etc.
 * @returns {Object} Usuario recién creado con sus datos
 */
const createUserWithPermissions = async (userData, roleName = 'cliente') => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            country_id, phone, user_create,
            document_type, document_number, address, date_birth,
            ...userFields
        } = userData;

        // 1. Crear usuario con role varchar ────────────────────────────────────
        const newUser = await User.create({
            ...userFields,
            role:        roleName,
            user_create: user_create || null
        }, { transaction });

        // 2. Insertar permisos por defecto según el tipo de usuario ────────────
        const defaultPerms = DEFAULT_PERMISSIONS[roleName] || [];
        if (defaultPerms.length > 0) {
            await UserPermission.bulkCreate(
                defaultPerms.map(key => ({
                    user_id:        newUser.user_id,
                    permission_key: key,
                    granted_by:     user_create || newUser.user_id,
                })),
                { ignoreDuplicates: true, transaction }
            );
        }

        // 3. Crear registro en Person si viene algún dato de identidad ─────────
        const hasPersonData = country_id || phone || document_number;
        if (hasPersonData) {
            await Person.create({
                user_id:         newUser.user_id,
                country_id:      country_id      || 1,
                phone:           phone           || null,
                document_type:   document_type   || null,
                document_number: document_number || null,
                address:         address         || null,
                date_birth:      date_birth       || null,
            }, { transaction });
        }

        await transaction.commit();
        return await getUserById(newUser.user_id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Busca un usuario por su ID.
 * @param {number} id - user_id
 * @returns {Object|null} Usuario con datos de Person
 */
const getUserById = async (id) => {
    return await User.findByPk(id, {
        include: [
            {
                model: Person,
                as: 'person',
                include: [{ model: Country, as: 'country' }]
            }
        ]
    });
};

/**
 * Busca un usuario por correo electrónico.
 * @param {string} email
 * @returns {Object|null} Usuario con datos de Person
 */
const findUserByEmail = async (email) => {
    return await User.findOne({
        where: { email },
        include: [
            {
                model: Person,
                as: 'person',
                include: [{ model: Country, as: 'country' }]
            }
        ]
    });
};

/**
 * Busca un usuario por social_id o email (para login social).
 * @param {string|null} socialId
 * @param {string|null} email
 * @returns {Object|null}
 */
const findUserBySocialIdOrEmail = async (socialId, email) => {
    const conditions = [];
    if (socialId) conditions.push({ social_id: socialId });
    if (email)    conditions.push({ email });
    if (!conditions.length) return null;

    return await User.findOne({
        where: { [Op.or]: conditions },
        include: [
            {
                model: Person,
                as: 'person',
                include: [{ model: Country, as: 'country' }]
            }
        ]
    });
};

/**
 * Obtiene todos los usuarios con filtros y paginación (para system).
 * El filtro por rol usa User.role (varchar) directamente.
 * @param {Object} filters
 * @returns {{ users, pagination, stats }}
 */
const getAllUsers = async (filters = {}) => {
    const { role, searchTerm, limit = 10, offset = 0 } = filters;

    const whereConditions = {};

    // Filtro por término de búsqueda ────────────────────────────────────────────
    if (searchTerm) {
        whereConditions[Op.or] = [
            { first_name: { [Op.iLike]: `%${searchTerm}%` } },
            { last_name:  { [Op.iLike]: `%${searchTerm}%` } },
            { email:      { [Op.iLike]: `%${searchTerm}%` } },
        ];
    }

    // Filtro por tipo de usuario (User.role varchar) ──────────────────────────
    if (role) {
        whereConditions.role = role;
    }

    const users = await User.findAndCountAll({
        where: whereConditions,
        include: [
            {
                model: Person,
                as: 'person',
                attributes: { exclude: ['created_at', 'updated_at', 'user_id'] }
            }
        ],
        limit:    parseInt(limit),
        offset:   parseInt(offset),
        order:    [['created_at', 'DESC']],
        distinct: true,
    });

    const total      = users.count;
    const page       = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Estadísticas por tipo de usuario usando User.role ──────────────────────
    const roleStats = await User.findAll({
        attributes: [
            'role',
            [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count']
        ],
        group: ['role'],
        raw: true,
    });

    const stats = {
        totalUsers: total,
        byRole: { administrador: 0, cliente: 0, empleado: 0, super_admin: 0, system: 0 }
    };

    roleStats.forEach(item => {
        const roleName = item.role;
        const count    = parseInt(item.count);
        if (roleName && stats.byRole.hasOwnProperty(roleName)) {
            stats.byRole[roleName] = count;
        }
    });

    return {
        users: users.rows,
        pagination: { total, page, limit: parseInt(limit), totalPages },
        stats,
    };
};

/**
 * Actualiza datos de un usuario y su Person.
 * @param {number} id
 * @param {Object} data
 * @returns {Object|null}
 */
const updateUser = async (id, data) => {
    const user = await User.findByPk(id);
    if (!user) return null;

    // Separar datos de Person de los datos del usuario ─────────────────────────
    const { phone, country_id, ...userDataFields } = data;
    await user.update(userDataFields);

    // Actualizar o crear Person si viene phone o country_id ───────────────────
    if (phone !== undefined || country_id !== undefined) {
        const person = await Person.findOne({ where: { user_id: id } });
        const personData = {};
        if (phone      !== undefined) personData.phone      = phone;
        if (country_id !== undefined) personData.country_id = country_id;

        if (person) {
            await person.update(personData);
        } else {
            await Person.create({
                user_id:    id,
                ...personData,
                country_id: personData.country_id || 1
            });
        }
    }

    return user;
};

/**
 * Obtiene los permisos directos de un usuario desde dsg_bss_user_permissions.
 * Reemplaza a getUserRolesAndPermissions (que consultaba las tablas RBAC eliminadas).
 * @param {number} userId
 * @returns {string[]} Array de permission_key
 */
const getUserPermissions = async (userId) => {
    const rows = await UserPermission.findAll({
        where:      { user_id: userId },
        attributes: ['permission_key'],
        raw:        true,
    });
    return rows.map(r => r.permission_key);
};

/**
 * Obtiene todos los company_ids accesibles para un usuario admin.
 *
 * - system     → retorna [] (sin restricción, el caller debe bypass)
 * - super_admin → empresa asignada + todas sus sucursales hijas
 * - administrador / empleado → solo la sucursal asignada
 *
 * Usa UserCompany.role varchar directamente (sin join a tabla roles eliminada).
 * @param {number} userId
 * @returns {{ company_ids: number[], tenant_id: string|null }}
 */
const getUserCompanyAccess = async (userId) => {
    const assignments = await UserCompany.findAll({
        where: { user_id: userId, is_active: true },
    });

    if (!assignments.length) return { company_ids: [], tenant_id: null };

    const roles = assignments.map(a => a.role).filter(Boolean);

    // system no tiene restricción de empresa ───────────────────────────────────
    if (roles.includes('system')) return { company_ids: [], tenant_id: null };

    const directIds = assignments.map(a => Number(a.company_id));

    // super_admin puede tener empresas en múltiples tenants distintos.
    // Expandimos las sucursales de TODOS sus tenants para que el JWT
    // contenga todos los IDs accesibles.
    if (roles.includes('super_admin')) {
        const tenantIds = [...new Set(assignments.map(a => a.tenant_id).filter(Boolean))];

        const subsidiaries = await Company.findAll({
            where:      { tenant_id: tenantIds, is_enabled: 'A' },
            attributes: ['company_id'],
        });

        const allIds = Array.from(new Set([
            ...directIds,
            ...subsidiaries.map(s => Number(s.company_id)),
        ]));

        // tenant_id principal = el de la primera asignación (para compatibilidad con otros usos)
        return { company_ids: allIds, tenant_id: assignments[0].tenant_id };
    }

    return { company_ids: directIds, tenant_id: assignments[0].tenant_id };
};

/**
 * Asigna un usuario a una empresa/sucursal con un rol clasificador (varchar).
 * Inserta los permisos por defecto del rol en user_permissions si no los tiene.
 *
 * Reemplaza a la versión anterior que usaba role_id FK y creaba entradas en UserRole.
 * @param {number} userId
 * @param {number} companyId
 * @param {string} roleName - 'super_admin', 'administrador', 'empleado'
 * @param {string} tenantId
 * @param {number} createdBy
 * @returns {Object} Registro UserCompany
 */
const assignUserToCompany = async (userId, companyId, roleName, tenantId, createdBy) => {
    const transaction = await User.sequelize.transaction();
    try {
        // Crear o actualizar la asignación contextual ─────────────────────────
        const [assignment, created] = await UserCompany.findOrCreate({
            where:    { user_id: userId, company_id: companyId },
            defaults: { role: roleName, tenant_id: tenantId, created_by: createdBy, is_active: true },
            transaction,
        });

        // Si ya existía, actualizar role y asegurarse que está activa ─────────
        if (!created) {
            await assignment.update({ role: roleName, is_active: true, tenant_id: tenantId }, { transaction });
        }

        // Actualizar el clasificador en User también ──────────────────────────
        await User.update({ role: roleName }, { where: { user_id: userId }, transaction });

        // Insertar permisos por defecto del rol (ignorar los que ya tenga) ────
        const defaultPerms = DEFAULT_PERMISSIONS[roleName] || [];
        if (defaultPerms.length > 0) {
            await UserPermission.bulkCreate(
                defaultPerms.map(key => ({
                    user_id:        userId,
                    permission_key: key,
                    granted_by:     createdBy,
                })),
                { ignoreDuplicates: true, transaction }
            );
        }

        await transaction.commit();
        return assignment;
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

/**
 * Obtiene los usuarios asignados a una empresa o sucursal específica.
 * Usa UserCompany.role varchar directamente.
 * @param {number} companyId
 * @returns {Object[]}
 */
const getUsersByCompany = async (companyId) => {
    return await UserCompany.findAll({
        where: { company_id: companyId, is_active: true },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'role', 'is_enabled', 'created_at']
            }
        ],
        order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']]
    });
};

/**
 * Obtiene todo el staff del tenant (super_admin, administrador, empleado).
 * Filtra por UserCompany.role varchar directamente.
 * @param {number} companyId - ID de cualquier empresa del tenant
 * @returns {Object[]}
 */
const getTenantStaff = async (companyId) => {
    // 1. Obtener tenant_id de la empresa dada ──────────────────────────────────
    const company = await Company.findByPk(companyId, { attributes: ['tenant_id'] });
    if (!company) return [];
    const tenantId = company.tenant_id;

    // 2. Todas las companies del mismo tenant ──────────────────────────────────
    const tenantCompanies = await Company.findAll({
        where:      { tenant_id: tenantId },
        attributes: ['company_id', 'name']
    });
    const idList  = tenantCompanies.map(c => c.company_id);
    const nameMap = Object.fromEntries(tenantCompanies.map(c => [c.company_id, c.name]));

    // 3. Staff del tenant — excluye clientes y system ──────────────────────────
    const assignments = await UserCompany.findAll({
        where: {
            company_id: { [Op.in]: idList },
            is_active:  true,
            role:       { [Op.in]: ['super_admin', 'administrador', 'empleado'] }
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'is_enabled', 'created_at'],
                include: [{
                    model:    Person,
                    as:       'person',
                    attributes: ['phone', 'document_type', 'document_number', 'address', 'date_birth', 'country_id'],
                    include: [{
                        model:      Country,
                        as:         'country',
                        attributes: ['country_id', 'country', 'iso_country']
                    }],
                    required: false
                }]
            }
        ],
        order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']]
    });

    // 4. Enriquecer con nombre de empresa/sucursal ─────────────────────────────
    return assignments.map(a => ({
        ...a.toJSON(),
        company_name: nameMap[a.company_id] || null
    }));
};

/**
 * Cuenta cuántos usuarios activos tienen el rol dado en una empresa/sucursal.
 * Usa UserCompany.role varchar directamente.
 * @param {number} companyId
 * @param {string} roleName
 * @returns {number}
 */
const countStaffByRoleForCompany = async (companyId, roleName) => {
    return await UserCompany.count({
        where: { company_id: companyId, is_active: true, role: roleName },
    });
};

/**
 * Visión global del staff para el rol system.
 * Usa UserCompany.role varchar directamente.
 * @param {Object} params
 * @returns {{ staff, pagination }}
 */
const getStaffOverview = async ({ role, companyId, search, page = 1, limit = 20 }) => {
    // Filtro por rol — por defecto solo muestra super_admin y administrador ─────
    const roleFilter = role
        ? { role }
        : { role: { [Op.in]: ['super_admin', 'administrador'] } };

    const userWhere = {};
    if (search) {
        userWhere[Op.or] = [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name:  { [Op.iLike]: `%${search}%` } },
            { email:      { [Op.iLike]: `%${search}%` } }
        ];
    }

    const where = { is_active: true, ...roleFilter };
    if (companyId) where.company_id = companyId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await UserCompany.findAndCountAll({
        where,
        include: [
            {
                model: User,
                as: 'user',
                where: Object.keys(userWhere).length ? userWhere : undefined,
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'role', 'is_enabled', 'created_at']
            },
            {
                model: Company,
                as: 'company',
                attributes: ['company_id', 'name', 'tenant_id']
            }
        ],
        order:    [[{ model: User, as: 'user' }, 'first_name', 'ASC']],
        limit:    parseInt(limit),
        offset,
        distinct: true,
    });

    return {
        staff: rows,
        pagination: {
            total:      count,
            page:       parseInt(page),
            limit:      parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Actualiza datos de un usuario del staff (User + Person).
 * @param {number} userId
 * @param {Object} data
 * @returns {Object|null}
 */
const updateStaffUser = async (userId, data) => {
    const user = await User.findByPk(userId);
    if (!user) return null;

    const { phone, document_type, document_number, country_id, address, date_birth, ...userFields } = data;

    if (Object.keys(userFields).length > 0) {
        await user.update(userFields);
    }

    const personData    = { phone, document_type, document_number, country_id, address, date_birth };
    const hasPersonData = Object.values(personData).some(v => v !== undefined);

    if (hasPersonData) {
        const [person] = await Person.findOrCreate({
            where:    { user_id: userId },
            defaults: { user_id: userId, country_id: country_id || 1 }
        });
        const toUpdate = Object.fromEntries(
            Object.entries(personData).filter(([, v]) => v !== undefined)
        );
        await person.update(toUpdate);
    }

    return getUserById(userId);
};

module.exports = {
    createUserWithPermissions,
    getUserById,
    findUserByEmail,
    findUserBySocialIdOrEmail,
    getAllUsers,
    updateUser,
    getUserPermissions,
    getUserCompanyAccess,
    assignUserToCompany,
    getUsersByCompany,
    getTenantStaff,
    countStaffByRoleForCompany,
    getStaffOverview,
    updateStaffUser,
};
