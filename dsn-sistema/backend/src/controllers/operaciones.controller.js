/**
 * Controlador de operaciones de comercio exterior.
 *
 * Es el modulo mas complejo del sistema porque orquesta el flujo completo:
 * registro → clasificacion BRM → verificacion sanciones → firma digital → auditoria.
 *
 * Endpoints:
 *   GET    /api/operaciones                    — listar (con filtro por rol)
 *   POST   /api/operaciones                    — registrar y procesar automaticamente
 *   GET    /api/operaciones/:id                — detalle completo
 *   PATCH  /api/operaciones/:id/clasificar     — clasificacion manual (OFICIAL)
 *   PATCH  /api/operaciones/:id/aprobar        — aprobar con firma digital (OFICIAL)
 *   PATCH  /api/operaciones/:id/bloquear       — bloquear (AREA_LEGAL)
 *   PATCH  /api/operaciones/:id/desbloquear    — emitir resolucion de desbloqueo (AREA_LEGAL)
 */

const crypto = require('crypto');
const { validationResult } = require('express-validator');

const Operacion                = require('../models/Operacion.model');
const ClasificacionArancelaria = require('../models/ClasificacionArancelaria.model');
const AlertaCumplimiento       = require('../models/AlertaCumplimiento.model');
const FirmaDigital             = require('../models/FirmaDigital.model');
const ResolucionLegal          = require('../models/ResolucionLegal.model');
const ParametroSistema         = require('../models/ParametroSistema.model');

const brmService        = require('../services/brm.service');
const sancionesService  = require('../services/sanciones.service');
const auditoriaService  = require('../services/auditoria.service');

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

/**
 * Lee el umbral de confianza BRM desde la base de datos.
 * Si no existe el parametro, usa 75 como valor por defecto.
 */
async function obtenerUmbralBRM() {
  const param = await ParametroSistema.findOne({ nombre: 'UMBRAL_CONFIANZA_BRM' });
  return param ? parseInt(param.valor, 10) : 75;
}

/**
 * Ejecuta el pipeline BRM + Sanciones y devuelve el estado resultante
 * junto con los datos de clasificacion y la alerta (si aplica).
 *
 * @param {Object} operacion - Documento Mongoose de la operacion recien creada
 * @returns {Promise<{ estado, clasificacion, alerta }>}
 */
async function procesarOperacion(operacion) {
  const umbral = await obtenerUmbralBRM();

  // Paso 1 — Clasificacion arancelaria
  const resultadoBRM = await brmService.clasificarProducto({
    producto:    operacion.producto,
    paisOrigen:  operacion.paisOrigen,
    paisDestino: operacion.paisDestino,
    valorFOB:    operacion.valorFOB,
  });

  let estadoFinal = 'REQUIERE_REVISION_MANUAL';
  let alertaTipo  = 'CLASIFICACION_BAJA_CONFIANZA';
  let alertaDesc  = 'La confianza del BRM esta por debajo del umbral. Se requiere clasificacion manual.';
  let crearAlerta = true;

  if (resultadoBRM.porcentajeConfianza >= umbral) {
    // Paso 2 — Verificacion de sanciones (solo si BRM dio confianza suficiente)
    const resultadoSanciones = await sancionesService.verificarContraparte({
      contraparte:  operacion.contraparte,
      paisDestino:  operacion.paisDestino,
    });

    if (resultadoSanciones.bloqueado) {
      estadoFinal = 'BLOQUEADA';
      alertaTipo  = resultadoSanciones.fuente === 'EMBARGO' ? 'EMBARGO_ACTIVO' : 'SANCION_DETECTADA';
      alertaDesc  = resultadoSanciones.motivo;
    } else {
      estadoFinal = 'CLASIFICACION_APROBADA';
      crearAlerta = false;
    }
  }

  // Guardar clasificacion arancelaria
  const clasificacion = await ClasificacionArancelaria.create({
    operacionId:         operacion._id,
    partidaArancelaria:  resultadoBRM.partidaArancelaria,
    porcentajeConfianza: resultadoBRM.porcentajeConfianza,
    tlcAplicado:         resultadoBRM.tlcAplicado,
    montoImpuestos:      resultadoBRM.montoImpuestos,
    requiereRevision:    resultadoBRM.requiereRevision,
  });

  // Crear alerta si el proceso detecto un problema
  let alerta = null;
  if (crearAlerta) {
    alerta = await AlertaCumplimiento.create({
      operacionId: operacion._id,
      tipo:        alertaTipo,
      descripcion: alertaDesc,
    });
  }

  return { estadoFinal, clasificacion, alerta };
}

// ---------------------------------------------------------------------------
// Handlers de rutas
// ---------------------------------------------------------------------------

/**
 * GET /api/operaciones
 * AREA_OPERATIVA solo ve sus propias operaciones; los demas roles ven todas.
 * Soporta filtro por estado: GET /api/operaciones?estado=BLOQUEADA
 */
async function listarOperaciones(req, res) {
  try {
    const filtro = {};

    if (req.usuario.rol === 'AREA_OPERATIVA') {
      filtro.registradaPor = req.usuario._id;
    }

    if (req.query.estado) {
      filtro.estado = req.query.estado;
    }

    const operaciones = await Operacion.find(filtro)
      .populate('registradaPor', 'nombre email rol')
      .sort({ fechaRegistro: -1 });

    res.json({ total: operaciones.length, operaciones });
  } catch (error) {
    console.error('Error al listar operaciones:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/operaciones
 * Registra la operacion y ejecuta automaticamente el pipeline BRM + Sanciones.
 */
async function crearOperacion(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  const { producto, paisOrigen, paisDestino, valorFOB, contraparte } = req.body;

  try {
    // Crear la operacion en estado inicial
    const operacion = await Operacion.create({
      producto,
      paisOrigen,
      paisDestino,
      valorFOB,
      contraparte,
      registradaPor: req.usuario._id,
    });

    // Ejecutar el pipeline de clasificacion y sanciones
    const { estadoFinal, clasificacion, alerta } = await procesarOperacion(operacion);

    // Actualizar el estado segun el resultado del pipeline
    operacion.estado = estadoFinal;
    await operacion.save();

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'OPERACION_CREADA',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   `Producto: "${producto}" | Estado resultado: ${estadoFinal}`,
    });

    res.status(201).json({
      operacion,
      clasificacion,
      alerta,
    });
  } catch (error) {
    console.error('Error al crear operacion:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * GET /api/operaciones/:id
 * Devuelve la operacion con su clasificacion, alertas y resoluciones relacionadas.
 */
async function obtenerOperacion(req, res) {
  try {
    const operacion = await Operacion.findById(req.params.id)
      .populate('registradaPor', 'nombre email rol');

    if (!operacion) {
      return res.status(404).json({ error: 'Operacion no encontrada' });
    }

    // AREA_OPERATIVA solo puede ver sus propias operaciones
    if (
      req.usuario.rol === 'AREA_OPERATIVA' &&
      operacion.registradaPor._id.toString() !== req.usuario._id.toString()
    ) {
      return res.status(403).json({ error: 'No tiene acceso a esta operacion' });
    }

    // Cargar documentos relacionados en paralelo
    const [clasificacion, alertas, resoluciones, firmas] = await Promise.all([
      ClasificacionArancelaria.findOne({ operacionId: operacion._id })
        .populate('aprobadaPor', 'nombre rol'),
      AlertaCumplimiento.find({ operacionId: operacion._id })
        .populate('atendidaPor', 'nombre rol'),
      ResolucionLegal.find({ operacionId: operacion._id })
        .populate('emitidaPor', 'nombre rol'),
      FirmaDigital.find({ operacionId: operacion._id })
        .populate('usuarioId', 'nombre rol'),
    ]);

    res.json({ operacion, clasificacion, alertas, resoluciones, firmas });
  } catch (error) {
    console.error('Error al obtener operacion:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/operaciones/:id/clasificar
 * Permite al OFICIAL_CUMPLIMIENTO asignar manualmente la partida arancelaria
 * cuando la confianza del BRM fue insuficiente.
 * Body: { partidaArancelaria }
 */
async function clasificarManualmente(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const operacion = await Operacion.findById(req.params.id);

    if (!operacion) {
      return res.status(404).json({ error: 'Operacion no encontrada' });
    }

    if (operacion.estado !== 'REQUIERE_REVISION_MANUAL') {
      return res.status(400).json({
        error: 'Solo se puede clasificar manualmente una operacion en estado REQUIERE_REVISION_MANUAL',
        estadoActual: operacion.estado,
      });
    }

    // Actualizar la clasificacion existente con la partida manual
    const clasificacion = await ClasificacionArancelaria.findOneAndUpdate(
      { operacionId: operacion._id },
      {
        partidaArancelaria: req.body.partidaArancelaria,
        requiereRevision:   false,
        aprobadaPor:        req.usuario._id,
        fechaClasificacion: new Date(),
      },
      { new: true }
    );

    operacion.estado = 'CLASIFICACION_APROBADA';
    await operacion.save();

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'CLASIFICACION_MANUAL',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   `Partida asignada manualmente: ${req.body.partidaArancelaria}`,
    });

    res.json({ operacion, clasificacion });
  } catch (error) {
    console.error('Error al clasificar manualmente:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/operaciones/:id/aprobar
 * El OFICIAL_CUMPLIMIENTO aprueba la operacion y genera su firma digital.
 * La firma es SHA-256(operacionId + usuarioId + timestamp).
 */
async function aprobarOperacion(req, res) {
  try {
    const operacion = await Operacion.findById(req.params.id);

    if (!operacion) {
      return res.status(404).json({ error: 'Operacion no encontrada' });
    }

    if (operacion.estado !== 'CLASIFICACION_APROBADA') {
      return res.status(400).json({
        error: 'Solo se puede aprobar una operacion en estado CLASIFICACION_APROBADA',
        estadoActual: operacion.estado,
      });
    }

    const timestamp = new Date().toISOString();

    // Generar hash SHA-256 que vincula la firma a esta operacion, usuario y momento
    const hash = crypto
      .createHash('sha256')
      .update(`${operacion._id}${req.usuario._id}${timestamp}`)
      .digest('hex');

    const firma = await FirmaDigital.create({
      operacionId: operacion._id,
      usuarioId:   req.usuario._id,
      hash,
    });

    operacion.estado = 'APROBADA';
    await operacion.save();

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'OPERACION_APROBADA',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   `Firma digital generada. Hash: ${hash.substring(0, 16)}...`,
    });

    res.json({ operacion, firma });
  } catch (error) {
    console.error('Error al aprobar operacion:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/operaciones/:id/bloquear
 * El AREA_LEGAL bloquea manualmente una operacion que presento irregularidades.
 * Body: { motivo }
 */
async function bloquearOperacion(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const operacion = await Operacion.findById(req.params.id);

    if (!operacion) {
      return res.status(404).json({ error: 'Operacion no encontrada' });
    }

    const estadosPermitidos = ['CLASIFICACION_APROBADA', 'REQUIERE_REVISION_MANUAL'];
    if (!estadosPermitidos.includes(operacion.estado)) {
      return res.status(400).json({
        error: `No se puede bloquear una operacion en estado ${operacion.estado}`,
      });
    }

    operacion.estado = 'BLOQUEADA';
    await operacion.save();

    await AlertaCumplimiento.create({
      operacionId: operacion._id,
      tipo:        'SANCION_DETECTADA',
      descripcion: req.body.motivo || 'Bloqueada manualmente por el Area Legal.',
    });

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'OPERACION_BLOQUEADA',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   req.body.motivo,
    });

    res.json({ operacion });
  } catch (error) {
    console.error('Error al bloquear operacion:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * PATCH /api/operaciones/:id/desbloquear
 * El AREA_LEGAL emite una resolucion legal para levantar el bloqueo.
 * Body: { tipo, justificacion, referenciaNormativa }
 */
async function desbloquearOperacion(req, res) {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ errores: errores.array() });
  }

  try {
    const operacion = await Operacion.findById(req.params.id);

    if (!operacion) {
      return res.status(404).json({ error: 'Operacion no encontrada' });
    }

    if (operacion.estado !== 'BLOQUEADA') {
      return res.status(400).json({
        error: 'Solo se puede desbloquear una operacion en estado BLOQUEADA',
        estadoActual: operacion.estado,
      });
    }

    const resolucion = await ResolucionLegal.create({
      operacionId:         operacion._id,
      tipo:                req.body.tipo,
      justificacion:       req.body.justificacion,
      referenciaNormativa: req.body.referenciaNormativa,
      emitidaPor:          req.usuario._id,
    });

    operacion.estado = 'EN_CONTINGENCIA';
    await operacion.save();

    await auditoriaService.registrar({
      usuarioId: req.usuario._id,
      accion:    'OPERACION_DESBLOQUEADA',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   `Resolucion tipo ${req.body.tipo}: ${req.body.justificacion}`,
    });

    res.json({ operacion, resolucion });
  } catch (error) {
    console.error('Error al desbloquear operacion:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

module.exports = {
  listarOperaciones,
  crearOperacion,
  obtenerOperacion,
  clasificarManualmente,
  aprobarOperacion,
  bloquearOperacion,
  desbloquearOperacion,
};
