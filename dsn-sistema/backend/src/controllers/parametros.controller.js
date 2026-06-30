/**
 * Controlador de parametros de configuracion del sistema.
 *
 * Permite al ADMINISTRADOR ajustar el comportamiento del sistema sin
 * modificar codigo ni reiniciar el servidor.
 *
 * Endpoints:
 *   GET   /api/parametros/:nombre — obtener un parametro especifico
 *   GET   /api/parametros         — listar todos los parametros
 *   PATCH /api/parametros/:nombre — actualizar el valor de un parametro
 *
 * Acceso restringido a: ADMINISTRADOR.
 */

const { validationResult } = require('express-validator');
const ParametroSistema  = require('../models/ParametroSistema.model');
const auditoriaService  = require('../services/auditoria.service');

/**
 * GET /api/parametros
 * Devuelve todos los parametros del sistema.
 */
async function listarParametros(req, res) {
  try {
    const parametros = await ParametroSistema.find().sort({ nombre: 1 });
    res.json({ parametros });
  } catch (error) {
    console.error('Error al listar parametros:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/parametros/:nombre
 * Actualiza el valor de un parametro identificado por su nombre.
 * Body: { valor }
 */
async function actualizarParametro(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const parametro = await ParametroSistema.findOneAndUpdate(
      { nombre: req.params.nombre.toUpperCase() },
      { valor: req.body.valor },
      { new: true }
    );

    if (!parametro) {
      return res.status(404).json({ error: 'Parametro no encontrado' });
    }

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'PARAMETRO_ACTUALIZADO',
      entidad:   'ParametroSistema',
      entidadId: parametro._id,
      detalle:   `Parametro "${parametro.nombre}" actualizado a "${parametro.valor}"`,
    });

    res.json({ parametro });
  } catch (error) {
    console.error('Error al actualizar parametro:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { listarParametros, actualizarParametro };
