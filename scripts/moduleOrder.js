/**
 * moduleOrder.js
 * Define el orden de ejecución de módulos para migraciones y seeders.
 * El orden respeta las dependencias de FK entre tablas de distintos módulos.
 *
 * Regla: un módulo solo puede depender de módulos que aparezcan ANTES en la lista.
 */

// Orden de dependencia entre módulos ──────────────────────────────────────────
const MODULE_ORDER = [
    'catalogs',      // Sin dependencias externas (Country, Permission, SportType, etc.)
    'users',         // Depende de: catalogs (Country, Permission)
    'media',         // Polimórfico — sin FK duras a otros módulos
    'facility',      // Depende de: users, catalogs
    'booking',       // Depende de: users, facility, catalogs
    'notification',  // Depende de: users, facility
];

module.exports = { MODULE_ORDER };
