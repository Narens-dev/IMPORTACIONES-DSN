/**
 * Rutas de autenticacion.
 *
 *   POST /api/auth/login  — publica, no requiere token
 *   GET  /api/auth/me     — protegida, requiere token valido
 */

const { Router } = require('express');
const { body }   = require('express-validator');

const { login, obtenerPerfil } = require('../controllers/auth.controller');
const { verificarToken }        = require('../middleware/auth.middleware');

const router = Router();

// Validaciones del body para el endpoint de login
const validarLogin = [
  body('email')
    .isEmail().withMessage('Debe ser un email valido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contrasena es requerida')
    .isLength({ min: 6 }).withMessage('La contrasena debe tener al menos 6 caracteres'),
];

router.post('/login', validarLogin, login);
router.get('/me', verificarToken, obtenerPerfil);

module.exports = router;
