/**
 * Servicio de Verificacion de Sanciones (C-4 simulado).
 *
 * Consulta sanciones.json para determinar si una contraparte o un pais
 * esta bloqueado por listas internacionales (OFAC, ONU, embargos).
 *
 * En produccion este servicio se reemplazaria por una llamada a la API
 * real de OFAC (sanctions.ofac.treas.gov) sin cambiar la interfaz del modulo.
 * El resto del sistema no sabria la diferencia.
 *
 * La comparacion es case-insensitive y elimina espacios extra para reducir
 * falsos negativos por diferencias de formato en los nombres.
 */

const path = require('path');
const fs   = require('fs');

const RUTA_SANCIONES = path.join(__dirname, '../data/sanciones.json');

/**
 * Normaliza un string para comparacion: minusculas y sin espacios extra.
 *
 * @param {string} texto
 * @returns {string}
 */
function normalizar(texto) {
  return texto.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Verifica si una contraparte o pais de destino esta en alguna lista de sanciones.
 *
 * @param {Object} params
 * @param {string} params.contraparte  - Nombre de la empresa o persona contraparte
 * @param {string} params.paisDestino  - Pais al que se exporta
 * @returns {Promise<Object>} Resultado de la verificacion
 * @returns {boolean} .bloqueado  - true si hay alguna restriccion
 * @returns {string}  .motivo     - Descripcion de por que esta bloqueado
 * @returns {string}  .fuente     - Lista que origino el bloqueo (OFAC, ONU, EMBARGO)
 */
async function verificarContraparte({ contraparte, paisDestino }) {
  const { entidades_sancionadas, paises_embargo } = JSON.parse(
    fs.readFileSync(RUTA_SANCIONES, 'utf-8')
  );

  const contraparteNorm = normalizar(contraparte);
  const paisNorm        = normalizar(paisDestino);

  // Verificar contraparte contra la lista de entidades sancionadas
  const entidadSancionada = entidades_sancionadas.find(
    (e) => normalizar(e) === contraparteNorm
  );

  if (entidadSancionada) {
    return {
      bloqueado: true,
      motivo:    `La contraparte "${contraparte}" aparece en la lista de entidades sancionadas.`,
      fuente:    'OFAC',
    };
  }

  // Verificar si el pais de destino tiene embargo activo
  const paisBloqueado = paises_embargo.find(
    (p) => normalizar(p) === paisNorm
  );

  if (paisBloqueado) {
    return {
      bloqueado: true,
      motivo:    `El pais de destino "${paisDestino}" tiene embargo activo.`,
      fuente:    'EMBARGO',
    };
  }

  // Sin coincidencias: la operacion puede continuar
  return {
    bloqueado: false,
    motivo:    null,
    fuente:    null,
  };
}

module.exports = { verificarContraparte };
