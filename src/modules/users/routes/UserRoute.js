// /modules/users/routes/UserRoute.js
const express = require('express');
const router = express.Router();
const { createUserDto, createAdminUserDto, updateStaffUserDto, staffOverviewQueryDto } = require('../dto/UserDto');
const { validateDTO, validateQuery } = require('../../../shared/middlewares/validateDTO');
const { protegerPermiso, protegerPermisoConScope } = require('../../../shared/middlewares/proteger');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const {
    createUser,
    loginUser,
    loginAdmin,
    socialLogin,
    getAllUsers,
    searchClients,
    registerAdminUser,
    getUsersByCompany,
    getTenantStaff,
    getStaffOverview,
    updateStaffUser,
    logout,
    changePassword,
    forgotPassword,
    resetPassword
} = require('../controllers/UserController');

/**
 * @route POST /api/users/register
 * @desc Registro de nuevo cliente desde BOOKING SPORT
 * @access Public — solo crea usuarios con rol cliente
 */
router.post('/register', validateDTO(createUserDto), GlobalErrorHandler.asyncHandler(createUser));

/**
 * @route POST /api/users/login
 * @desc Inicio de sesión para clientes — portal Booking Sport
 * @access Public — solo rol cliente puede ingresar
 */
router.post('/login', GlobalErrorHandler.asyncHandler(loginUser));

/**
 * @route POST /api/users/admin-login
 * @desc Inicio de sesión para el módulo administrador
 * @access Public — system, super_admin, administrador, empleado
 */
router.post('/admin-login', GlobalErrorHandler.asyncHandler(loginAdmin));

/**
 * @route POST /api/users/social-login
 * @desc Autenticación social (Google, Facebook, etc.) — portal Booking Sport
 * @access Public — solo clientes
 */
router.post('/social-login', GlobalErrorHandler.asyncHandler(socialLogin));

/**
 * @route POST /api/users/logout
 * @desc Cierra sesión invalidando el token actual en Redis (blacklist)
 * @access Privado — cualquier usuario autenticado
 */
router.post('/logout', verificarTokenAuth, GlobalErrorHandler.asyncHandler(logout));

// ─── Gestión de Contraseñas ───────────────────────────────────────────────────

/**
 * @route PUT /api/users/change-password
 * @desc Cambia la contraseña validando la contraseña actual
 * @access Privado — usuario autenticado
 */
router.put('/change-password', verificarTokenAuth, GlobalErrorHandler.asyncHandler(changePassword));

/**
 * @route POST /api/users/forgot-password
 * @desc Solicita recuperación de contraseña por correo
 * @access Público
 */
router.post('/forgot-password', GlobalErrorHandler.asyncHandler(forgotPassword));

/**
 * @route POST /api/users/reset-password
 * @desc Restablece la contraseña usando token
 * @access Público
 */
router.post('/reset-password', GlobalErrorHandler.asyncHandler(resetPassword));

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @route GET /api/users/get-all-users
 * @desc Obtener todos los usuarios con filtros y paginación
 * @access system
 */
router.get(
    '/get-all-users',
    ...protegerPermiso('user.manage_all'),
    GlobalErrorHandler.asyncHandler(getAllUsers)
);

/**
 * @route GET /api/users/search-clients
 * @desc Busca usuarios con rol cliente para la creación de reservas
 * @access Autenticado (system, super_admin, administrador, empleado)
 */
router.get(
    '/search-clients',
    verificarTokenAuth,
    GlobalErrorHandler.asyncHandler(searchClients)
);

/**
 * @route POST /api/users/register-admin
 * @desc Registrar un usuario admin (super_admin / administrador / empleado)
 * @access system (cualquier rol), super_admin (solo administrador/empleado), administrador (solo empleado)
 * @note  La restricción por rol se aplica en el service (employee.manage_own es el mínimo)
 */
router.post(
    '/register-admin',
    ...protegerPermiso('employee.manage_own'),
    validateDTO(createAdminUserDto),
    GlobalErrorHandler.asyncHandler(registerAdminUser)
);

/**
 * @route GET /api/users/staff/overview
 * @desc Visión global de propietarios y administradores de todas las empresas
 * @access system
 */
router.get(
    '/staff/overview',
    ...protegerPermiso('user.manage_all'),
    validateQuery(staffOverviewQueryDto),
    GlobalErrorHandler.asyncHandler(getStaffOverview)
);

/**
 * @route PUT /api/users/staff/:userId
 * @desc Actualizar datos básicos de un usuario staff (nombre, apellido, email)
 * @access system, super_admin, administrador — scope restringido en service
 */
router.put(
    '/staff/:userId',
    ...protegerPermiso('employee.manage_own'),
    validateDTO(updateStaffUserDto),
    GlobalErrorHandler.asyncHandler(updateStaffUser)
);

/**
 * @route GET /api/users/company/:companyId
 * @desc Obtener usuarios asignados a una empresa o sucursal
 * @access system, super_admin, administrador — scope por companyId
 */
router.get(
    '/company/:companyId',
    ...protegerPermisoConScope('employee.manage_own'),
    GlobalErrorHandler.asyncHandler(getUsersByCompany)
);

/**
 * @route GET /api/users/tenant-staff/:companyId
 * @desc Todo el staff del tenant (super_admin, administrador, empleado de todas las sucursales)
 * @access system, super_admin — scope por companyId
 */
router.get(
    '/tenant-staff/:companyId',
    ...protegerPermisoConScope('administrator.manage_own'),
    GlobalErrorHandler.asyncHandler(getTenantStaff)
);

module.exports = router;
