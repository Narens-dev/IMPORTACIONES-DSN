/**
 * Controlador de autenticacion.
 *
 * Expone dos operaciones:
 *   POST /api/auth/login  — valida credenciales y devuelve un JWT
 *   GET  /api/auth/me     — devuelve el perfil del usuario autenticado
 *
 * El token JWT contiene el ID del usuario y su rol. El tiempo de expiracion
 * se configura en .env (JWT_EXPIRES_IN). Por defecto: 8 horas de sesion.
 */

const bcrypt    = require('bcryptjs');
const jwt       = require('jsonwebtoken');
const { validationResult } = require('express-validator');

const Usuario        = require('../models/Usuario.model');
const auditoriaService = require('../services/auditoria.service');

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
  // Detener si express-validator encontro errores en el body
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { email, password } = req.body;

  try {
    // Buscar usuario incluyendo password para poder comparar el hash
    const usuario = await Usuario.findOne({ email: email.toLowerCase() }).select('+password');

    if (!usuario || !usuario.activo) {
      // Mismo mensaje para email inexistente y cuenta inactiva (evita enumeracion)
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Generar token con el minimo de datos necesarios en el payload
    const token = jwt.sign(
      { id: usuario._id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Registrar el inicio de sesion en el log de auditoria
    await auditoriaService.registrar({
      usuarioId: usuario._id,
      accion:    'LOGIN',
      entidad:   'Usuario',
      entidadId: usuario._id,
      detalle:   `Inicio de sesion desde IP ${req.ip}`,
    });

    // Responder sin exponer el hash de la contrasena (toJSON lo elimina)
    res.json({
      token,
      usuario: usuario.toJSON(),
    });
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/auth/me
 * Requiere header: Authorization: Bearer <token>
 * req.usuario es inyectado por auth.middleware.js
 */
async function obtenerPerfil(req, res) {
  // El middleware ya cargo el usuario; solo lo devolvemos
  res.json({ usuario: req.usuario });
}

module.exports = { login, obtenerPerfil };
