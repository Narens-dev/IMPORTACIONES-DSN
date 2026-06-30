/**
 * Modelo de parametros de configuracion del sistema.
 *
 * Permite al Administrador ajustar el comportamiento del sistema sin modificar
 * el codigo ni reiniciar el servidor. Los servicios leen estos parametros en
 * tiempo de ejecucion desde la base de datos.
 *
 * Parametros iniciales (cargados por seed.js):
 *   UMBRAL_CONFIANZA_BRM        = 75  (minimo para clasificacion automatica)
 *   TIEMPO_LIMITE_ALERTAS_HORAS = 24  (horas antes de escalar una alerta)
 */

const { Schema, model } = require('mongoose');

const ParametroSistemaSchema = new Schema(
  {
    // Clave unica en mayusculas con guiones bajos (ej: "UMBRAL_CONFIANZA_BRM")
    nombre:      { type: String, required: true, unique: true, uppercase: true, trim: true },
    valor:       { type: String, required: true },
    descripcion: { type: String },
  },
  { timestamps: true }
);

module.exports = model('ParametroSistema', ParametroSistemaSchema);
