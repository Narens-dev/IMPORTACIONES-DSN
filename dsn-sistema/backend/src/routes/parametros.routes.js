/**
 * Rutas de configuracion del sistema.
 *
 *   GET   /api/parametros         — ADMINISTRADOR
 *   PATCH /api/parametros/:nombre — ADMINISTRADOR
 */

const { Router } = require('express');
const { body }   = require('express-validator');

const { listarParametros, actualizarParametro } = require('../controllers/parametros.controller');
const { verificarToken }                         = require('../middleware/auth.middleware');
const { permitirRoles }                          = require('../middleware/roles.middleware');

const router = Router();

const validarValor = [
  body('valor').notEmpty().withMessage('El valor es requerido').trim(),
];

router.get('/',          verificarToken, permitirRoles('ADMINISTRADOR'), listarParametros);
router.patch('/:nombre', verificarToken, permitirRoles('ADMINISTRADOR'), validarValor, actualizarParametro);

module.exports = router;
