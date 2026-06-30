/**
 * Modelo de alerta de cumplimiento.
 *
 * Se crea automaticamente cuando el sistema detecta un problema en una operacion.
 * El parametro TIEMPO_LIMITE_ALERTAS_HORAS define cuanto tiempo puede estar
 * en PENDIENTE antes de escalar a ESCALADA.
 *
 * Tipos de alerta:
 *   SANCION_DETECTADA          - la contraparte aparece en la lista OFAC/ONU
 *   EMBARGO_ACTIVO             - el pais de destino tiene embargo
 *   CERTIFICACION_VENCIDA      - documentacion caducada (uso futuro)
 *   CLASIFICACION_BAJA_CONFIANZA - el BRM no pudo clasificar con certeza suficiente
 *   API_NO_DISPONIBLE          - fallo de conexion con un servicio externo (uso futuro)
 */

const { Schema, model } = require('mongoose');

const AlertaSchema = new Schema(
  {
    operacionId: {
      type:     Schema.Types.ObjectId,
      ref:      'Operacion',
      required: true,
    },
    tipo: {
      type: String,
      enum: [
        'SANCION_DETECTADA',
        'EMBARGO_ACTIVO',
        'CERTIFICACION_VENCIDA',
        'CLASIFICACION_BAJA_CONFIANZA',
        'API_NO_DISPONIBLE',
      ],
      required: true,
    },
    estado: {
      type:    String,
      enum:    ['PENDIENTE', 'ATENDIDA', 'ESCALADA'],
      default: 'PENDIENTE',
    },
    descripcion:   { type: String },
    fechaCreacion: { type: Date, default: Date.now },
    // Se rellena cuando un Oficial o el area Legal atiende la alerta
    atendidaPor:   { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fechaAtencion: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = model('AlertaCumplimiento', AlertaSchema);
