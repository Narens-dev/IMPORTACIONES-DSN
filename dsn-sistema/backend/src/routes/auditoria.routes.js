/**
 * Rutas del log de auditoria (solo lectura).
 *
 *   GET /api/auditoria — AREA_AUDITORIA, ADMINISTRADOR
 *
 * No existe ningun endpoint de escritura, modificacion ni eliminacion
 * en este modulo. El log es append-only (WORM).
 */

const { Router } = require('express');

const { consultarLog }   = require('../controllers/auditoria.controller');
const { verificarToken } = require('../middleware/auth.middleware');
const { permitirRoles }  = require('../middleware/roles.middleware');

const router = Router();

router.get('/', verificarToken, permitirRoles('AREA_AUDITORIA', 'ADMINISTRADOR'), consultarLog);

module.exports = router;
