/**
 * 
 * Rutas del módulo reports — página de inicio del panel administrativo.
 * Montado en /api/reports
 */
const express = require('express');
const router  = express.Router();

const GlobalErrorHandler = require('../../../shared/handlers/GlobalErrorHandler');
const { verificarTokenAuth } = require('../../../shared/middlewares/verificarTokenAuth');
const { getHomeData } = require('../controllers/InicioController');

// GET /api/reports/home?month=X&year=Y
// Accesible para cualquier usuario autenticado del panel admin
router.get(
    '/home',
    verificarTokenAuth,
    GlobalErrorHandler.asyncHandler(getHomeData)
);

module.exports = router;
