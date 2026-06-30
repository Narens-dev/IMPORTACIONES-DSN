/**
 * Middleware de autenticacion JWT.
 *
 * Verifica que cada peticion a rutas protegidas incluya un token valido
 * en el header Authorization con formato: "Bearer <token>".
 *
 * Si el token es valido, adjunta el objeto del usuario al request (req.usuario)
 * para que los controladores y middlewares siguientes puedan usarlo sin
 * volver a consultar la base de datos en cada paso.
 */

const jwt      = require('jsonwebtoken');
const Usuario  = require('../models/Usuario.model');

/**
 * Valida el JWT y carga el usuario en req.usuario.
 * Llama a next() si todo es correcto; responde 401 en cualquier fallo.
 */
async function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorizacion requerido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Recargar el usuario desde la BD para detectar cuentas desactivadas
    const usuario = await Usuario.findById(payload.id).select('-password');

    if (!usuario || !usuario.activo) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    // jwt.verify lanza TokenExpiredError o JsonWebTokenError segun el fallo
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'El token ha expirado. Inicie sesion nuevamente' });
    }
    return res.status(401).json({ error: 'Token invalido' });
  }
}

module.exports = { verificarToken };
