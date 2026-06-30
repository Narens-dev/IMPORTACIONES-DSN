/**
 * Controlador del log de auditoria.
 *
 * Este controlador es de solo lectura. No existe ningun endpoint que modifique
 * o elimine entradas del log (garantia WORM del sistema).
 *
 * Endpoint:
 *   GET /api/auditoria  — consultar el log con filtros y paginacion
 *
 * Acceso restringido a: AREA_AUDITORIA, ADMINISTRADOR.
 */

const auditoriaService = require('../services/auditoria.service');

/**
 * GET /api/auditoria
 * Parametros de query opcionales:
 *   accion    — filtrar por tipo de accion (ej: ?accion=LOGIN)
 *   entidad   — filtrar por entidad afectada (ej: ?entidad=Operacion)
 *   pagina    — numero de pagina (default 1)
 *   limite    — registros por pagina (default 50, max 200)
 */
async function consultarLog(req, res) {
  try {
    const filtros = {};

    if (req.query.accion)  filtros.accion  = req.query.accion;
    if (req.query.entidad) filtros.entidad = req.query.entidad;

    const pagina = Math.max(1, parseInt(req.query.pagina, 10) || 1);
    const limite = Math.min(200, parseInt(req.query.limite, 10) || 50);

    const resultado = await auditoriaService.consultar({ filtros, pagina, limite });

    res.json(resultado);
  } catch (error) {
    console.error('Error al consultar auditoria:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = { consultarLog };
