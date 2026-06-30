/**
 * Rutas de operaciones de comercio exterior.
 *
 * Todos los endpoints requieren autenticacion.
 * El control de roles esta basado en la tabla RBAC de la seccion 9 del plan.
 *
 *   GET    /api/operaciones                   — OFICIAL, LEGAL, OPERATIVA*, AUDITORIA, ADMIN
 *   POST   /api/operaciones                   — OFICIAL, OPERATIVA, ADMIN
 *   GET    /api/operaciones/:id               — OFICIAL, LEGAL, OPERATIVA*, AUDITORIA, ADMIN
 *   PATCH  /api/operaciones/:id/clasificar    — OFICIAL
 *   PATCH  /api/operaciones/:id/aprobar       — OFICIAL
 *   PATCH  /api/operaciones/:id/bloquear      — LEGAL
 *   PATCH  /api/operaciones/:id/desbloquear   — LEGAL
 *
 * (*) AREA_OPERATIVA solo ve las operaciones que ella misma registro.
 */

const { Router } = require('express');
const { body }   = require('express-validator');

const {
  listarOperaciones,
  crearOperacion,
  obtenerOperacion,
  clasificarManualmente,
  aprobarOperacion,
  bloquearOperacion,
  desbloquearOperacion,
} = require('../controllers/operaciones.controller');

const { verificarToken }  = require('../middleware/auth.middleware');
const { permitirRoles }   = require('../middleware/roles.middleware');

const router = Router();

// Todos los roles con acceso al modulo de operaciones
const ROLES_LECTURA   = ['OFICIAL_CUMPLIMIENTO', 'AREA_LEGAL', 'AREA_OPERATIVA', 'AREA_AUDITORIA', 'ADMINISTRADOR'];
const ROLES_REGISTRO  = ['OFICIAL_CUMPLIMIENTO', 'AREA_OPERATIVA', 'ADMINISTRADOR'];

// Validaciones para crear una operacion
const validarCreacion = [
  body('producto').notEmpty().withMessage('El producto es requerido').trim(),
  body('paisOrigen').notEmpty().withMessage('El pais de origen es requerido').trim(),
  body('paisDestino').notEmpty().withMessage('El pais de destino es requerido').trim(),
  body('valorFOB')
    .isFloat({ min: 0.01 }).withMessage('El valor FOB debe ser un numero mayor a 0'),
  body('contraparte').notEmpty().withMessage('La contraparte es requerida').trim(),
];

const validarClasificacion = [
  body('partidaArancelaria')
    .notEmpty().withMessage('La partida arancelaria es requerida')
    .matches(/^\d{4}\.\d{2}$/).withMessage('Formato de partida invalido. Use XXXX.XX'),
];

const validarBloqueo = [
  body('motivo').notEmpty().withMessage('El motivo del bloqueo es requerido').trim(),
];

const validarDesbloqueo = [
  body('tipo')
    .isIn(['DESBLOQUEO', 'BLOQUEO_DEFINITIVO', 'APROBACION_CONDICIONADA'])
    .withMessage('Tipo de resolucion invalido'),
  body('justificacion')
    .notEmpty().withMessage('La justificacion es requerida')
    .isLength({ min: 20 }).withMessage('La justificacion debe tener al menos 20 caracteres')
    .trim(),
  body('referenciaNormativa').optional().trim(),
];

router.get('/',    verificarToken, permitirRoles(...ROLES_LECTURA),  listarOperaciones);
router.post('/',   verificarToken, permitirRoles(...ROLES_REGISTRO), validarCreacion, crearOperacion);
router.get('/:id', verificarToken, permitirRoles(...ROLES_LECTURA),  obtenerOperacion);

router.patch('/:id/clasificar',  verificarToken, permitirRoles('OFICIAL_CUMPLIMIENTO', 'ADMINISTRADOR'), validarClasificacion, clasificarManualmente);
router.patch('/:id/aprobar',     verificarToken, permitirRoles('OFICIAL_CUMPLIMIENTO', 'ADMINISTRADOR'), aprobarOperacion);
router.patch('/:id/bloquear',    verificarToken, permitirRoles('AREA_LEGAL', 'ADMINISTRADOR'),           validarBloqueo,       bloquearOperacion);
router.patch('/:id/desbloquear', verificarToken, permitirRoles('AREA_LEGAL', 'ADMINISTRADOR'),           validarDesbloqueo,    desbloquearOperacion);

module.exports = router;
