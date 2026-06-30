/**
 * Modelo de resolucion legal.
 *
 * El Area Legal emite una resolucion para desbloquear, bloquear definitivamente
 * o aprobar con condiciones una operacion que fue marcada como BLOQUEADA.
 * Cada resolucion debe incluir una justificacion y la norma que la respalda.
 */

const { Schema, model } = require('mongoose');

const ResolucionSchema = new Schema(
  {
    operacionId: {
      type:     Schema.Types.ObjectId,
      ref:      'Operacion',
      required: true,
    },
    tipo: {
      type:     String,
      enum:     ['DESBLOQUEO', 'BLOQUEO_DEFINITIVO', 'APROBACION_CONDICIONADA'],
      required: true,
    },
    // Argumento juridico que sustenta la decision
    justificacion:       { type: String, required: true },
    // Norma, decreto o articulo de ley que se aplica (ej: "Decreto 1165 de 2019, Art. 3")
    referenciaNormativa: { type: String },
    emitidaPor:          { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fechaEmision:        { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = model('ResolucionLegal', ResolucionSchema);
