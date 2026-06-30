/**
 * Modelo de clasificacion arancelaria.
 *
 * El BRM (brm.service.js) genera un registro de este tipo cada vez que
 * clasifica una operacion. Si la confianza es baja, el Oficial de Cumplimiento
 * puede sobreescribir la partida manualmente (aprobadaPor se rellena entonces).
 */

const { Schema, model } = require('mongoose');

const ClasificacionSchema = new Schema(
  {
    operacionId: {
      type:     Schema.Types.ObjectId,
      ref:      'Operacion',
      required: true,
    },
    // Partida arancelaria en formato XXXX.XX segun nomenclatura NANDINA
    partidaArancelaria:  { type: String },
    // Porcentaje de certeza del BRM (0-100). Valores < umbral requieren revision manual
    porcentajeConfianza: { type: Number, min: 0, max: 100 },
    // Nombre del TLC aplicado o null si no aplica ninguno
    tlcAplicado:         { type: String, default: null },
    montoImpuestos:      { type: Number, min: 0 },
    requiereRevision:    { type: Boolean, default: false },
    // Solo se rellena cuando un Oficial aprueba o corrige la clasificacion
    aprobadaPor:         { type: Schema.Types.ObjectId, ref: 'Usuario', default: null },
    fechaClasificacion:  { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = model('ClasificacionArancelaria', ClasificacionSchema);
