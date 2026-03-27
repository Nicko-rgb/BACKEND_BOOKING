const User = require('../models/User');
const { UserRole, UserCompany, Person } = require('../models');
const { Role, Country } = require('../../catalogs/models');
const { Company } = require('../../facility/models');
const { Op, Sequelize } = require('sequelize');

// Crear nuevo usuario y asignarle rol por defecto - BBOKIGN SPORT
const createUserWithRole = async (userData, roleName = 'cliente') => {
    const transaction = await User.sequelize.transaction();
    try {
        const {
            country_id, phone, user_create,
            document_type, document_number, address, date_birth,
            ...userFields
        } = userData;

        // 1. Crear usuario
        const newUser = await User.create({
            ...userFields,
            user_create: user_create || null
        }, { transaction });

        // 2. Buscar el rol
        const role = await Role.findOne({ where: { role_name: roleName }, transaction });
        if (!role) throw new Error(`Rol '${roleName}' no encontrado`);

        // 3. Asignar rol
        await UserRole.create({
            user_id: newUser.user_id,
            role_id: role.role_id
        }, { transaction });

        // 4. Crear registro en Person si viene algún dato de identidad
        const hasPersonData = country_id || phone || document_number;
        if (hasPersonData) {
            await Person.create({
                user_id:         newUser.user_id,
                country_id:      country_id || 1,
                phone:           phone           || null,
                document_type:   document_type   || null,
                document_number: document_number || null,
                address:         address         || null,
                date_birth:      date_birth      || null,
            }, { transaction });
        }

        await transaction.commit();
        return await getUserById(newUser.user_id);
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};

// Buscar por ID
const getUserById = async (id) => {
    return await User.findByPk(id, {
        include: [
            {
                model: Role,
                through: UserRole,
                attributes: ['role_name'],
                as: 'roles'
            },
            {
                model: Person,
                as: 'person',
                include: [
                    {
                        model: Country,
                        as: 'country'
                    }
                ]
            }
        ]
    });
};

// Buscar por correo electrónico
const findUserByEmail = async (email) => {
    return await User.findOne({
        where: { email },
        include: [
            {
                model: Role,
                through: UserRole,
                attributes: ['role_name'],
                as: 'roles'
            },
            {
                model: Person,
                as: 'person',
                include: [
                    {
                        model: Country,
                        as: 'country'
                    }
                ]
            }
        ]
    });
};

// Buscar por social_id o email
const findUserBySocialIdOrEmail = async (socialId, email) => {
    // Construir condiciones dinámicamente
    const conditions = [];

    if (socialId) {
        conditions.push({ social_id: socialId });
    }

    if (email) {
        conditions.push({ email: email });
    }

    // Si no hay condiciones válidas, retornar null
    if (conditions.length === 0) {
        return null;
    }

    return await User.findOne({
        where: {
            [Op.or]: conditions
        },
        include: [
            {
                model: Role,
                through: UserRole,
                attributes: ['role_name'],
                as: 'roles'
            },
            {
                model: Person,
                as: 'person',
                include: [
                    {
                        model: Country,
                        as: 'country'
                    }
                ]
            }
        ]
    });
};

// Obtener todos los usuarios con filtros para system
const getAllUsers = async (filters = {}) => {
    const { role, country, searchTerm, limit = 10, offset = 0 } = filters;

    const whereConditions = {};
    const include = [
        {
            model: Role,
            through: UserRole,
            as: 'roles',
            attributes: ['role_id', 'role_name']
        },
        {
            model: Person,
            as: 'person',
            attributes: {
                exclude: ['created_at', 'updated_at', 'user_id']
            }
        }
    ];

    // Filtro por término de búsqueda
    if (searchTerm) {
        whereConditions[Op.or] = [
            { first_name: { [Op.iLike]: `%${searchTerm}%` } },
            { last_name: { [Op.iLike]: `%${searchTerm}%` } },
            { email: { [Op.iLike]: `%${searchTerm}%` } },
            { '$person.phone$': { [Op.iLike]: `%${searchTerm}%` } },
            { '$person.document_number$': { [Op.iLike]: `%${searchTerm}%` } }
        ];
    }

    // Filtro por país
    if (country) {
        whereConditions.country_id = country;
    }

    // Filtro por rol
    if (role) {
        include[0].where = { role_name: role };
    }

    // Obtener usuarios paginados
    const users = await User.findAndCountAll({
        where: whereConditions,
        include,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
        distinct: true, // Asegura conteo correcto con joins
        subQuery: false // Evita el error de tabla faltante en Postgres con joins
    });

    // Calcular paginación (normalizada para coincidir con CompanyRepository)
    const total = users.count;
    const page = Math.floor(parseInt(offset) / parseInt(limit)) + 1;
    const totalPages = Math.ceil(total / parseInt(limit));

    // Obtener estadísticas por rol (todos los usuarios, no solo la página actual)
    const roleStats = await UserRole.findAll({
        include: [
            {
                model: Role,
                as: 'role',
                attributes: ['role_name']
            }
        ],
        attributes: [
            [Sequelize.fn('COUNT', Sequelize.col('user_id')), 'count'],
            [Sequelize.col('role.role_name'), 'role_name']
        ],
        group: ['role.role_name'],
        raw: true
    });

    // Formatear estadísticas
    const stats = {
        totalUsers: total,
        byRole: {
            administrador: 0,
            cliente: 0,
            super_admin: 0,
            system: 0,
        }
    };

    // Llenar estadísticas por rol
    roleStats.forEach(item => {
        const roleName = item['Role.role_name'] || item['role_name'];
        const count = parseInt(item.count);
        if (stats.byRole.hasOwnProperty(roleName)) {
            stats.byRole[roleName] = count;
        }
    });

    return {
        users: users.rows,
        pagination: {
            total,
            page,
            limit: parseInt(limit),
            totalPages
        },
        stats
    };
};

// Actualizar usuario y su información en Person
const updateUser = async (id, data) => {
    const user = await User.findByPk(id);
    if (!user) return null;

    // Separar datos de Person de los datos del usuario
    const { phone, country_id, ...userDataFields } = data;

    // Actualizar usuario (sin phone y country_id)
    await user.update(userDataFields);

    // Actualizar o crear Person si viene phone o country_id
    if (phone !== undefined || country_id !== undefined) {
        const person = await Person.findOne({ where: { user_id: id } });
        
        const personData = {};
        if (phone !== undefined) personData.phone = phone;
        if (country_id !== undefined) personData.country_id = country_id;

        if (person) {
            await person.update(personData);
        } else {
            // Si no existe Person, crearlo
            await Person.create({
                user_id: id,
                ...personData,
                country_id: personData.country_id || 1 // Default si no viene
            });
        }
    }

    return user;
};

// Obtener roles y permisos de un usuario
const getUserRolesAndPermissions = async (userId) => {
    const UserRole = require('../models/UserRole');
    const UserPermission = require('../models/UserPermission');
    const { Role, RolePermission } = require('../../catalogs/models');

    // 1. Roles del usuario
    const userRoleRows = await UserRole.findAll({
        where: { user_id: userId },
        include: [{ model: Role, as: 'role', attributes: ['role_id', 'role_name'] }],
    });

    const roles = userRoleRows.map((row) => row?.role?.role_name).filter(Boolean);
    const roleIds = userRoleRows.map((row) => row?.role?.role_id).filter(Boolean);

    // 2. Permisos de los roles (tabla role_permissions)
    const rolePermRows = await RolePermission.findAll({
        where: { role_id: roleIds },
        attributes: ['permission_key'],
        raw: true,
    });

    // 3. Permisos directos del usuario (tabla user_permissions)
    const userPermRows = await UserPermission.findAll({
        where: { user_id: userId },
        attributes: ['permission_key'],
        raw: true,
    });

    // 4. Unión de ambos conjuntos
    const permissions = Array.from(new Set([
        ...rolePermRows.map((r) => r.permission_key),
        ...userPermRows.map((r) => r.permission_key),
    ]));

    return { roles, permissions };
};

/**
 * Obtiene todos los company_ids accesibles para un usuario admin.
 *
 * - system     → retorna [] (sin restricción, el caller debe bypass)
 * - super_admin → empresa asignada + todas sus sucursales hijas
 * - administrador / empleado → solo la sucursal asignada
 *
 * Retorna: { company_ids: number[], tenant_id: string|null }
 */
const getUserCompanyAccess = async (userId) => {
    const assignments = await UserCompany.findAll({
        where: { user_id: userId, is_active: true },
        include: [{ model: Role, as: 'role', attributes: ['role_name', 'app_access'] }]
    });

    if (!assignments.length) return { company_ids: [], tenant_id: null };

    const tenantId = assignments[0].tenant_id;
    const roleNames = assignments.map(a => a.role?.role_name).filter(Boolean);

    // system no tiene restricción de empresa
    if (roleNames.includes('system')) return { company_ids: [], tenant_id: null };

    const directIds = assignments.map(a => Number(a.company_id));

    // super_admin: incluir también todas las sucursales de su empresa
    if (roleNames.includes('super_admin')) {
        const subsidiaries = await Company.findAll({
            where: { tenant_id: tenantId, is_enabled: 'A' },
            attributes: ['company_id']
        });
        const allIds = Array.from(new Set([
            ...directIds,
            ...subsidiaries.map(s => Number(s.company_id))
        ]));
        return { company_ids: allIds, tenant_id: tenantId };
    }

    return { company_ids: directIds, tenant_id: tenantId };
};

/**
 * Asigna un usuario a una empresa/sucursal con un rol contextual.
 * También crea/asegura la entrada en UserRole para que getUserRolesAndPermissions funcione.
 */
const assignUserToCompany = async (userId, companyId, roleName, tenantId, createdBy) => {
    const transaction = await User.sequelize.transaction();
    try {
        const role = await Role.findOne({ where: { role_name: roleName }, transaction });
        if (!role) throw new Error(`Rol '${roleName}' no encontrado`);

        // Asegurar que tiene el rol global en UserRole
        await UserRole.findOrCreate({
            where: { user_id: userId, role_id: role.role_id },
            transaction
        });

        // Crear o actualizar la asignación contextual
        const [assignment] = await UserCompany.findOrCreate({
            where: { user_id: userId, company_id: companyId, role_id: role.role_id },
            defaults: { tenant_id: tenantId, created_by: createdBy, is_active: true },
            transaction
        });

        if (!assignment.is_active) {
            await assignment.update({ is_active: true, tenant_id: tenantId }, { transaction });
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
 */
const getUsersByCompany = async (companyId) => {
    return await UserCompany.findAll({
        where: { company_id: companyId, is_active: true },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'is_enabled', 'created_at']
            },
            {
                model: Role,
                as: 'role',
                attributes: ['role_id', 'role_name']
            }
        ],
        order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']]
    });
};

/**
 * Obtiene todo el staff (administrador, empleado) de todas las empresas/sucursales
 * que comparten el mismo tenant_id que la empresa indicada.
 * También devuelve los super_admin de la empresa principal.
 */
const getTenantStaff = async (companyId) => {
    // 1. Obtener el tenant_id de la empresa dada
    const company = await Company.findByPk(companyId, { attributes: ['tenant_id'] });
    if (!company) return [];

    const tenantId = company.tenant_id;

    // 2. Obtener todas las companies del mismo tenant
    const tenantCompanyIds = await Company.findAll({
        where: { tenant_id: tenantId },
        attributes: ['company_id', 'name']
    });
    const idList = tenantCompanyIds.map(c => c.company_id);
    const nameMap = Object.fromEntries(tenantCompanyIds.map(c => [c.company_id, c.name]));

    // 3. Obtener todos los UserCompany de ese tenant (excluye clientes y system)
    const assignments = await UserCompany.findAll({
        where: {
            company_id: { [Op.in]: idList },
            is_active: true
        },
        include: [
            {
                model: User,
                as: 'user',
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'is_enabled', 'created_at'],
                include: [{
                    model: Person,
                    as: 'person',
                    attributes: ['phone', 'document_type', 'document_number', 'address', 'date_birth', 'country_id'],
                    include: [{
                        model: Country,
                        as: 'country',
                        attributes: ['country_id', 'country', 'iso_country']
                    }],
                    required: false
                }]
            },
            {
                model: Role,
                as: 'role',
                attributes: ['role_id', 'role_name'],
                where: { role_name: { [Op.in]: ['super_admin', 'administrador', 'empleado'] } }
            }
        ],
        order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']]
    });

    // 4. Enriquecer con nombre de empresa/sucursal
    return assignments.map(a => ({
        ...a.toJSON(),
        company_name: nameMap[a.company_id] || null
    }));
};

/**
 * Cuenta cuántos usuarios activos tienen el rol dado en una empresa/sucursal.
 * Usado para validar unicidad: 1 super_admin por empresa, 1 administrador por sucursal.
 */
const countStaffByRoleForCompany = async (companyId, roleName) => {
    return await UserCompany.count({
        where: { company_id: companyId, is_active: true },
        include: [{
            model: Role,
            as: 'role',
            where: { role_name: roleName },
            required: true
        }]
    });
};

/**
 * Visión global del staff para el rol system.
 * Devuelve propietarios (super_admin) y/o administradores de todas las empresas.
 */
const getStaffOverview = async ({ role, companyId, search, page = 1, limit = 20 }) => {
    const roleFilter = role
        ? { role_name: role }
        : { role_name: { [Op.in]: ['super_admin', 'administrador'] } };

    const userWhere = {};
    if (search) {
        userWhere[Op.or] = [
            { first_name: { [Op.iLike]: `%${search}%` } },
            { last_name:  { [Op.iLike]: `%${search}%` } },
            { email:      { [Op.iLike]: `%${search}%` } }
        ];
    }

    const where = { is_active: true };
    if (companyId) where.company_id = companyId;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await UserCompany.findAndCountAll({
        where,
        include: [
            {
                model: User,
                as: 'user',
                where: Object.keys(userWhere).length ? userWhere : undefined,
                attributes: ['user_id', 'first_name', 'last_name', 'email', 'is_enabled', 'created_at']
            },
            {
                model: Role,
                as: 'role',
                where: roleFilter,
                attributes: ['role_id', 'role_name'],
                required: true
            },
            {
                model: Company,
                as: 'company',
                attributes: ['company_id', 'name', 'tenant_id']
            }
        ],
        order: [[{ model: User, as: 'user' }, 'first_name', 'ASC']],
        limit: parseInt(limit),
        offset,
        distinct: true
    });

    return {
        staff: rows,
        pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / parseInt(limit))
        }
    };
};

/**
 * Actualiza datos de un usuario del staff (User + Person).
 */
const updateStaffUser = async (userId, data) => {
    const user = await User.findByPk(userId);
    if (!user) return null;

    const { phone, document_type, document_number, country_id, address, date_birth, ...userFields } = data;

    if (Object.keys(userFields).length > 0) {
        await user.update(userFields);
    }

    const personData = { phone, document_type, document_number, country_id, address, date_birth };
    const hasPersonData = Object.values(personData).some(v => v !== undefined);

    if (hasPersonData) {
        const [person] = await Person.findOrCreate({
            where: { user_id: userId },
            defaults: { user_id: userId, country_id: country_id || 1 }
        });
        const toUpdate = Object.fromEntries(Object.entries(personData).filter(([, v]) => v !== undefined));
        await person.update(toUpdate);
    }

    return getUserById(userId);
};

module.exports = {
    createUserWithRole,
    getUserById,
    findUserByEmail,
    findUserBySocialIdOrEmail,
    getAllUsers,
    updateUser,
    getUserRolesAndPermissions,
    getUserCompanyAccess,
    assignUserToCompany,
    getUsersByCompany,
    getTenantStaff,
    countStaffByRoleForCompany,
    getStaffOverview,
    updateStaffUser,
};
