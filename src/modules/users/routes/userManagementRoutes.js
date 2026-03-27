/**
 * userManagementRoutes.js
 * Rutas de gestión de usuarios, roles, permisos y menú dinámico.
 * Absorbidas del módulo admin — ahora disponibles en /api/users/*
 */
const express = require('express');
const router = express.Router();

const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { proteger, protegerPermiso } = require('../../../shared/middlewares/proteger');
const { validateDTO, validateQuery } = require('../../../shared/middlewares/validateDTO');
const {
    updateRolePermissionsDto,
    setUserPermissionsDto,
    getUsersQueryDto,
} = require('../dto/UserManagementDto');

const {
    getPermissions,
    getRoles,
    updateRolePermissions,
    getUsers,
    getUserDetail,
    setUserDirectPermissions,
    getMenu,
} = require('../controllers/UserManagementController');

// ── Menú dinámico ─────────────────────────────────────────────────────────────
router.get('/menu',
    ...proteger(['system', 'super_admin', 'administrador', 'empleado']),
    GlobalErrorHandler.asyncHandler(getMenu)
);

// ── Catálogo de permisos ──────────────────────────────────────────────────────
router.get('/permissions',
    ...proteger(['system', 'super_admin', 'administrador', 'empleado']),
    GlobalErrorHandler.asyncHandler(getPermissions)
);

// ── Roles ─────────────────────────────────────────────────────────────────────
router.get('/roles',
    ...proteger(['system', 'super_admin', 'administrador', 'empleado']),
    GlobalErrorHandler.asyncHandler(getRoles)
);

router.put('/roles/:roleId/permissions',
    ...protegerPermiso('role.manage'),
    validateDTO(updateRolePermissionsDto),
    GlobalErrorHandler.asyncHandler(updateRolePermissions)
);

// ── Usuarios (lista + detalle) ────────────────────────────────────────────────
// NOTA: estas rutas deben registrarse DESPUÉS de UserRoute.js en app.js
// para que GET /staff/overview, /company/:id, etc. no sean capturadas por /:userId

router.get('/',
    ...proteger(['system', 'super_admin', 'administrador', 'empleado']),
    validateQuery(getUsersQueryDto),
    GlobalErrorHandler.asyncHandler(getUsers)
);

router.get('/:userId',
    ...proteger(['system', 'super_admin', 'administrador', 'empleado']),
    GlobalErrorHandler.asyncHandler(getUserDetail)
);

router.put('/:userId/permissions',
    ...protegerPermiso('role.manage'),
    validateDTO(setUserPermissionsDto),
    GlobalErrorHandler.asyncHandler(setUserDirectPermissions)
);

module.exports = router;
