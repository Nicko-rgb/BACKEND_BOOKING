/**
 * userManagementRoutes.js
 * Rutas de gestión de usuarios, permisos y menú dinámico.
 *
 * Nota: las rutas de roles (GET /roles, PUT /roles/:id/permissions) fueron eliminadas
 * junto con la tabla dsg_bss_roles en la migración a permisos directos por usuario.
 */
const express = require('express');
const router  = express.Router();

const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { protegerPermiso } = require('../../../shared/middlewares/proteger');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const { validateDTO, validateQuery } = require('../../../shared/middlewares/validateDTO');
const {
    createPermissionDto,
    updatePermissionDto,
    setUserPermissionsDto,
    getUsersQueryDto,
    assignOwnerDto,
} = require('../dto/UserManagementDto');

const {
    getPermissions,
    getUsersByPermission,
    createPermission,
    updatePermission,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenu,
    assignOwner,
} = require('../controllers/UserManagementController');

// ── Menú dinámico — cualquier usuario admin autenticado puede acceder ─────────
router.get('/menu',
    verificarTokenAuth,
    GlobalErrorHandler.asyncHandler(getMenu)
);

// ── Catálogo de permisos ──────────────────────────────────────────────────────
router.get('/permissions',
    ...protegerPermiso('role.manage'),
    GlobalErrorHandler.asyncHandler(getPermissions)
);

router.get('/permissions/:key/users',
    ...protegerPermiso('role.manage'),
    GlobalErrorHandler.asyncHandler(getUsersByPermission)
);

router.post('/permissions',
    ...protegerPermiso('role.manage'),
    validateDTO(createPermissionDto),
    GlobalErrorHandler.asyncHandler(createPermission)
);

router.put('/permissions/:key',
    ...protegerPermiso('role.manage'),
    validateDTO(updatePermissionDto),
    GlobalErrorHandler.asyncHandler(updatePermission)
);

// ── Asignación de propietario ─────────────────────────────────────────────────
// Debe ir ANTES de /:userId para que no sea capturada por esa ruta genérica
router.post('/assign-owner',
    ...protegerPermiso('company.manage_own'),
    validateDTO(assignOwnerDto),
    GlobalErrorHandler.asyncHandler(assignOwner)
);

// ── Usuarios (lista + detalle) ────────────────────────────────────────────────
// NOTA: estas rutas deben registrarse DESPUÉS de UserRoute.js en server.js
// para que GET /staff/overview, /company/:id, etc. no sean capturadas por /:userId

router.get('/',
    ...protegerPermiso('employee.manage_own'),
    validateQuery(getUsersQueryDto),
    GlobalErrorHandler.asyncHandler(getUsers)
);

router.get('/:userId',
    ...protegerPermiso('employee.manage_own'),
    GlobalErrorHandler.asyncHandler(getUserDetail)
);

router.put('/:userId/permissions',
    ...protegerPermiso('role.manage'),
    validateDTO(setUserPermissionsDto),
    GlobalErrorHandler.asyncHandler(setUserDirectPermissions)
);

module.exports = router;
