/**
 * Modelo de firma digital.
 *
 * Representa la aprobacion formal de un Oficial de Cumplimiento sobre una operacion.
 * El hash se calcula en el controlador como SHA-256(operacionId + usuarioId + timestamp)
 * para garantizar que la firma esta vinculada a esa operacion especifica.
 *
 * Este modelo es inmutable: el servicio nunca expone endpoints de actualizacion
 * ni eliminacion de firmas.
 */

const { Schema, model } = require('mongoose');

const FirmaSchema = new Schema(
  {
    operacionId: {
      type:     Schema.Types.ObjectId,
      ref:      'Operacion',
      required: true,
    },
    usuarioId: {
      type:     Schema.Types.ObjectId,
      ref:      'Usuario',
      required: true,
    },
    // SHA-256 del string: operacionId + usuarioId + timestamp ISO
    hash:  { type: String, required: true },
    fecha: { type: Date, default: Date.now, immutable: true },
  },
  {
    timestamps: true,
    // No se permite actualizar documentos de firma una vez creados
  }
);

module.exports = model('FirmaDigital', FirmaSchema);
