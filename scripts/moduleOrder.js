/**
 * moduleOrder.js
 * Define el orden de ejecución de módulos para migraciones y seeders.
 * El orden respeta las dependencias de FK entre tablas de distintos módulos.
 *
 * Regla: un módulo solo puede depender de módulos que aparezcan ANTES en la lista.
 */

// Orden de dependencia entre módulos ──────────────────────────────────────────
const MODULE_ORDER = [
    'system',        // Sin dependencias externas (Country, Permission, SportType, SaaSPlan, etc.)
    'users',         // Depende de: system (Country, Permission)
    'media',         // Polimórfico — sin FK duras a otros módulos
    'facility',      // Depende de: users, system
    'booking',       // Depende de: users, facility, system
    'notification',  // Depende de: users, facility
];

module.exports = { MODULE_ORDER };
