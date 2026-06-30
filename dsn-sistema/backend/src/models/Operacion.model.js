/**
 * Modelo de operacion de comercio exterior.
 *
 * Es la entidad central del sistema. Cuando se crea una operacion, el C-2
 * la procesa automaticamente a traves del BRM y el modulo de sanciones,
 * actualizando el estado segun el resultado.
 *
 * Ciclo de vida del estado:
 *   PENDIENTE_CLASIFICACION
 *     -> CLASIFICACION_APROBADA  (BRM con confianza >= umbral, sin sanciones)
 *     -> REQUIERE_REVISION_MANUAL (BRM con confianza < umbral)
 *     -> BLOQUEADA               (contraparte o pais en lista de sanciones)
 *   CLASIFICACION_APROBADA
 *     -> APROBADA                (oficial firma)
 *     -> APROBADA_CON_CONDICIONES
 *   BLOQUEADA
 *     -> EN_CONTINGENCIA         (area legal emite resolucion de desbloqueo)
 */

const { Schema, model } = require('mongoose');

const ESTADOS_VALIDOS = [
  'PENDIENTE_CLASIFICACION',
  'CLASIFICACION_APROBADA',
  'REQUIERE_REVISION_MANUAL',
  'APROBADA',
  'APROBADA_CON_CONDICIONES',
  'BLOQUEADA',
  'EN_CONTINGENCIA',
];

const OperacionSchema = new Schema(
  {
    producto:      { type: String, required: true, trim: true },
    paisOrigen:    { type: String, required: true, trim: true },
    paisDestino:   { type: String, required: true, trim: true },
    valorFOB:      { type: Number, required: true, min: 0 },
    contraparte:   { type: String, required: true, trim: true },
    estado: {
      type:    String,
      enum:    ESTADOS_VALIDOS,
      default: 'PENDIENTE_CLASIFICACION',
    },
    registradaPor: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fechaRegistro: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = model('Operacion', OperacionSchema);
