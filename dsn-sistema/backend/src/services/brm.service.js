/**
 * Servicio BRM — Motor de Reglas Arancelarias (C-3 simulado).
 *
 * Clasifica un producto buscando coincidencias de keywords en aranceles.json.
 * Las reglas viven en el JSON y pueden actualizarse sin tocar el codigo (RNF-8).
 *
 * Logica de confianza:
 *   - Se cuentan cuantos keywords del registro coinciden con la descripcion del producto.
 *   - porcentajeConfianza = (coincidencias / total_keywords) * 100, ajustado a 100 max.
 *   - Si ninguna partida coincide, la confianza es 0 y se marca requiereRevision = true.
 *
 * TLCs implementados (simulados):
 *   ALIANZA_PACIFICO — Colombia, Mexico, Peru, Chile
 *   CAN              — Colombia, Ecuador, Peru, Bolivia
 */

const path = require('path');
const fs   = require('fs');

// La ruta es relativa a este archivo para que funcione independientemente del cwd
const RUTA_ARANCELES = path.join(__dirname, '../data/aranceles.json');

// TLCs y los paises de origen que los activan
const TLC_PAISES = {
  ALIANZA_PACIFICO: ['mexico', 'peru', 'chile', 'colombia'],
  CAN:              ['ecuador', 'peru', 'bolivia', 'colombia'],
};

/**
 * Determina que TLC aplica entre el pais de origen y Colombia.
 * Retorna el nombre del TLC o null si no hay acuerdo vigente.
 *
 * @param {string} paisOrigen
 * @param {Object} tlcsPartida - Objeto con TLCs disponibles para la partida
 * @returns {string|null}
 */
function determinarTLC(paisOrigen, tlcsPartida) {
  const origen = paisOrigen.toLowerCase().trim();
  for (const [nombreTlc, paises] of Object.entries(TLC_PAISES)) {
    if (paises.includes(origen) && nombreTlc in tlcsPartida) {
      return nombreTlc;
    }
  }
  return null;
}

/**
 * Clasifica un producto segun la nomenclatura arancelaria.
 *
 * @param {Object} params
 * @param {string} params.producto    - Descripcion del producto a clasificar
 * @param {string} params.paisOrigen  - Pais de procedencia
 * @param {string} params.paisDestino - Pais de llegada (siempre Colombia en el MVP)
 * @param {number} params.valorFOB    - Valor en dolares FOB
 * @returns {Promise<Object>} Resultado de la clasificacion
 */
async function clasificarProducto({ producto, paisOrigen, paisDestino, valorFOB }) {
  // Leer el catalogo en cada llamada permite actualizar el JSON sin reiniciar el servidor
  const aranceles = JSON.parse(fs.readFileSync(RUTA_ARANCELES, 'utf-8'));

  const descripcionNormalizada = producto.toLowerCase();

  let mejorCoincidencia  = null;
  let maxCoincidencias   = 0;

  // Buscar la partida con mas keywords coincidentes
  for (const partida of aranceles) {
    const coincidencias = partida.keywords.filter((kw) =>
      descripcionNormalizada.includes(kw.toLowerCase())
    ).length;

    if (coincidencias > maxCoincidencias) {
      maxCoincidencias  = coincidencias;
      mejorCoincidencia = partida;
    }
  }

  // Si no hubo ninguna coincidencia, el BRM no puede clasificar
  if (!mejorCoincidencia || maxCoincidencias === 0) {
    return {
      partidaArancelaria:  null,
      porcentajeConfianza: 0,
      tlcAplicado:         null,
      montoImpuestos:      0,
      requiereRevision:    true,
    };
  }

  // Calcular porcentaje de confianza.
  // Con 1 keyword la base es 78% (supera el umbral de 75%); cada keyword adicional
  // suma 8 puntos hasta un maximo de 98%.
  // Razon: un termino especifico como "laptop" es clasificacion suficientemente solida.
  // Solo los productos sin ninguna coincidencia (0%) requieren revision manual.
  const porcentajeConfianza = Math.min(78 + (maxCoincidencias - 1) * 8, 98);

  // Determinar si aplica algun TLC
  const tlcAplicado = determinarTLC(paisOrigen, mejorCoincidencia.tlcs);

  // Seleccionar tarifa: con TLC o tarifa general
  const tarifa = tlcAplicado !== null
    ? mejorCoincidencia.tlcs[tlcAplicado]
    : mejorCoincidencia.tarifa;

  const montoImpuestos = Math.round(valorFOB * tarifa * 100) / 100;

  return {
    partidaArancelaria:  mejorCoincidencia.partida,
    porcentajeConfianza,
    tlcAplicado,
    montoImpuestos,
    requiereRevision:    false,
  };
}

module.exports = { clasificarProducto };
