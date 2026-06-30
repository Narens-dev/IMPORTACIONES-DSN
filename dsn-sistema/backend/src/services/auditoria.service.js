/**
 * Servicio de Auditoria WORM (C-7).
 *
 * REGLA DE ORO: este archivo solo expone dos operaciones — registrar() y consultar().
 * No existe ni existira en este servicio ningun metodo de actualizacion o eliminacion.
 * Cualquier modificacion a esa regla debe tratarse como un defecto critico de seguridad.
 *
 * La inmutabilidad se garantiza en dos capas:
 *   1. El modelo LogAuditoria tiene el campo "fecha" con immutable:true.
 *   2. Este servicio nunca llama a .save(), .updateOne(), .findByIdAndUpdate()
 *      ni .deleteOne() sobre documentos de auditoria.
 */

const LogAuditoria = require('../models/LogAuditoria.model');

/**
 * Registra una accion en el log inmutable.
 * Debe llamarse desde cada controlador despues de toda operacion relevante.
 *
 * @param {Object}   params
 * @param {string}   [params.usuarioId]  - ID del usuario que realizo la accion (puede ser null para acciones del sistema)
 * @param {string}   params.accion       - Nombre corto de la accion (ej: "OPERACION_CREADA")
 * @param {string}   [params.entidad]    - Nombre del modelo afectado (ej: "Operacion")
 * @param {string}   [params.entidadId]  - ID del documento afectado
 * @param {string}   [params.detalle]    - Informacion adicional en texto libre
 * @returns {Promise<void>}
 */
async function registrar({ usuarioId = null, accion, entidad, entidadId, detalle }) {
  await LogAuditoria.create({ usuarioId, accion, entidad, entidadId, detalle });
}

/**
 * Consulta el log de auditoria con filtros opcionales y paginacion.
 *
 * @param {Object} opciones
 * @param {Object} [opciones.filtros]  - Filtros de Mongoose para la consulta (ej: { accion: 'LOGIN' })
 * @param {number} [opciones.pagina]   - Numero de pagina (base 1, default 1)
 * @param {number} [opciones.limite]   - Registros por pagina (default 50, max 200)
 * @returns {Promise<Object>} { datos, total, pagina, totalPaginas }
 */
async function consultar({ filtros = {}, pagina = 1, limite = 50 } = {}) {
  // Limitar el maximo por pagina para evitar respuestas demasiado grandes
  const limiteSeguro = Math.min(limite, 200);
  const skip = (pagina - 1) * limiteSeguro;

  const [datos, total] = await Promise.all([
    LogAuditoria.find(filtros)
      .populate('usuarioId', 'nombre email rol')
      .sort({ fecha: -1 })
      .skip(skip)
      .limit(limiteSeguro),
    LogAuditoria.countDocuments(filtros),
  ]);

  return {
    datos,
    total,
    pagina,
    totalPaginas: Math.ceil(total / limiteSeguro),
  };
}

module.exports = { registrar, consultar };
