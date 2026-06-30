/**
 * Controlador de alertas de cumplimiento.
 *
 * Endpoints:
 *   GET   /api/alertas           — listar alertas (con filtro opcional por estado)
 *   PATCH /api/alertas/:id/atender — marcar una alerta como atendida
 */

const AlertaCumplimiento = require('../models/AlertaCumplimiento.model');
const auditoriaService   = require('../services/auditoria.service');

/**
 * GET /api/alertas
 * Soporta filtro por estado: GET /api/alertas?estado=PENDIENTE
 * AREA_OPERATIVA y AREA_AUDITORIA no tienen acceso (controlado en la ruta).
 */
async function listarAlertas(req, res) {
  try {
    const filtro = {};

    if (req.query.estado) {
      filtro.estado = req.query.estado;
    }

    const alertas = await AlertaCumplimiento.find(filtro)
      .populate('operacionId', 'producto contraparte paisOrigen paisDestino estado')
      .populate('atendidaPor', 'nombre rol')
      .sort({ fechaCreacion: -1 });

    res.json({ total: alertas.length, alertas });
  } catch (error) {
    console.error('Error al listar alertas:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/alertas/:id/atender
 * Marca la alerta como ATENDIDA y registra quien la atendio.
 * Solo pueden atender alertas: OFICIAL_CUMPLIMIENTO, AREA_LEGAL.
 */
async function atenderAlerta(req, res) {
  try {
    const alerta = await AlertaCumplimiento.findById(req.params.id);

    if (!alerta) {
      return res.status(404).json({ error: 'Alerta no encontrada' });
    }

    if (alerta.estado !== 'PENDIENTE') {
      return res.status(400).json({
        error: 'Solo se pueden atender alertas en estado PENDIENTE',
        estadoActual: alerta.estado,
      });
    }

    alerta.estado        = 'ATENDIDA';
    alerta.atendidaPor   = req.usuario._id;
    alerta.fechaAtencion = new Date();
    await alerta.save();

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'ALERTA_ATENDIDA',
      entidad:   'AlertaCumplimiento',
      entidadId: alerta._id,
      detalle:   `Alerta tipo ${alerta.tipo} marcada como atendida`,
    });

    res.json({ alerta });
  } catch (error) {
    console.error('Error al atender alerta:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { listarAlertas, atenderAlerta };
