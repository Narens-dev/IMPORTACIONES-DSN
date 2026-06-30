/**
 * Rutas de alertas de cumplimiento.
 *
 *   GET   /api/alertas           — OFICIAL, LEGAL, ADMIN
 *   PATCH /api/alertas/:id/atender — OFICIAL, LEGAL
 */

const { Router } = require('express');

const { listarAlertas, atenderAlerta } = require('../controllers/alertas.controller');
const { verificarToken }               = require('../middleware/auth.middleware');
const { permitirRoles }                = require('../middleware/roles.middleware');

const router = Router();

const ROLES_VER     = ['OFICIAL_CUMPLIMIENTO', 'AREA_LEGAL', 'ADMINISTRADOR'];
const ROLES_ATENDER = ['OFICIAL_CUMPLIMIENTO', 'AREA_LEGAL', 'ADMINISTRADOR'];

router.get('/',                verificarToken, permitirRoles(...ROLES_VER),     listarAlertas);
router.patch('/:id/atender',   verificarToken, permitirRoles(...ROLES_ATENDER), atenderAlerta);

module.exports = router;
