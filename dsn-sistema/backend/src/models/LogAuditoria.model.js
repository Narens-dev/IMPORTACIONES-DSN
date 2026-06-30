/**
 * Modelo del log de auditoria WORM (Write Once, Read Many).
 *
 * Cada accion relevante del sistema genera un registro en esta coleccion.
 * La inmutabilidad se garantiza por dos mecanismos:
 *   1. El campo "fecha" tiene immutable:true en Mongoose (no puede modificarse).
 *   2. El servicio auditoria.service.js solo expone los metodos registrar() y
 *      consultar(). Nunca hay un endpoint de update ni delete para este modelo.
 *
 * Cualquier intento de modificar un log desde el codigo debe tratarse como
 * un error critico de seguridad.
 */

const { Schema, model } = require('mongoose');

const LogAuditoriaSchema = new Schema(
  {
    usuarioId: {
      type: Schema.Types.ObjectId,
      ref:  'Usuario',
      // Puede ser null si la accion es del sistema (ej: escalamiento automatico)
    },
    // Descripcion corta de la accion realizada (ej: "OPERACION_CREADA")
    accion:    { type: String, required: true },
    // Nombre de la coleccion afectada (ej: "Operacion", "AlertaCumplimiento")
    entidad:   { type: String },
    entidadId: { type: Schema.Types.ObjectId },
    // Informacion adicional en texto libre para contexto
    detalle:   { type: String },
    // immutable impide que Mongoose permita cambiar este campo tras la creacion
    fecha:     { type: Date, default: Date.now, immutable: true },
  },
  {
    // No se usan createdAt/updatedAt para no dar una segunda fecha mutable
    timestamps: false,
  }
);

module.exports = model('LogAuditoria', LogAuditoriaSchema);
