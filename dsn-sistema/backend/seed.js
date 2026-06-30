/**
 * Script de carga inicial de datos (seed).
 *
 * Uso: npm run seed
 *
 * Limpia las colecciones existentes e inserta:
 *   - 5 usuarios (uno por rol)
 *   - 5 operaciones con estados distintos para la demo
 *   - 1 clasificacion arancelaria por operacion
 *   - 2 parametros de configuracion del sistema
 *
 * Este script solo debe ejecutarse en entornos de desarrollo.
 * En produccion los datos reales se crean a traves de la API.
 */

require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const conectarDB                = require('./src/config/db');
const Usuario                   = require('./src/models/Usuario.model');
const Operacion                 = require('./src/models/Operacion.model');
const ClasificacionArancelaria  = require('./src/models/ClasificacionArancelaria.model');
const AlertaCumplimiento        = require('./src/models/AlertaCumplimiento.model');
const LogAuditoria              = require('./src/models/LogAuditoria.model');
const ParametroSistema          = require('./src/models/ParametroSistema.model');

// -------------------------------------------------------------------
// Datos de usuarios — una cuenta por cada rol del sistema
// -------------------------------------------------------------------
const USUARIOS_SEED = [
  { nombre: 'Carlos Ramirez',   email: 'oficial@dsn.com',    password: 'demo123', rol: 'OFICIAL_CUMPLIMIENTO' },
  { nombre: 'Ana Morales',      email: 'legal@dsn.com',      password: 'demo123', rol: 'AREA_LEGAL' },
  { nombre: 'Luis Torres',      email: 'operativo@dsn.com',  password: 'demo123', rol: 'AREA_OPERATIVA' },
  { nombre: 'Maria Gutierrez',  email: 'auditoria@dsn.com',  password: 'demo123', rol: 'AREA_AUDITORIA' },
  { nombre: 'Admin DSN',        email: 'admin@dsn.com',      password: 'demo123', rol: 'ADMINISTRADOR' },
];

// -------------------------------------------------------------------
// Datos de operaciones — cubren todos los estados posibles para la demo
// -------------------------------------------------------------------
// registradaPor se asigna dinamicamente con el ID del usuario AREA_OPERATIVA
const OPERACIONES_SEED = [
  {
    producto:    'Laptops Dell XPS 15',
    paisOrigen:  'China',
    paisDestino: 'Colombia',
    valorFOB:    50000,
    contraparte: 'TechImport Asia Ltd',
    estado:      'APROBADA',
    // Clasificacion correspondiente
    clasificacion: {
      partidaArancelaria:  '8471.30',
      porcentajeConfianza: 95,
      tlcAplicado:         'ALIANZA_PACIFICO',
      montoImpuestos:      0,       // TLC elimina arancel
      requiereRevision:    false,
    },
  },
  {
    producto:    'Tablets sin marca',
    paisOrigen:  'China',
    paisDestino: 'Colombia',
    valorFOB:    15000,
    contraparte: 'Global Tech Corp',
    estado:      'REQUIERE_REVISION_MANUAL',
    clasificacion: {
      partidaArancelaria:  '8471.41',
      porcentajeConfianza: 45,      // Por debajo del umbral de 75%
      tlcAplicado:         null,
      montoImpuestos:      750,
      requiereRevision:    true,
    },
  },
  {
    producto:    'Equipos de Red Cisco',
    paisOrigen:  'Iran',
    paisDestino: 'Colombia',
    valorFOB:    30000,
    contraparte: 'Iran Network Co',  // Entidad en lista de sanciones OFAC
    estado:      'BLOQUEADA',
    clasificacion: {
      partidaArancelaria:  '8517.62',
      porcentajeConfianza: 88,
      tlcAplicado:         null,
      montoImpuestos:      1500,
      requiereRevision:    false,
    },
  },
  {
    producto:    'Monitores LG 27"',
    paisOrigen:  'Mexico',
    paisDestino: 'Colombia',
    valorFOB:    20000,
    contraparte: 'LG Electronics MX',
    estado:      'PENDIENTE_CLASIFICACION',
    clasificacion: null,  // Aun no procesada por el BRM
  },
  {
    producto:    'Servidores HP ProLiant',
    paisOrigen:  'Estados Unidos',
    paisDestino: 'Colombia',
    valorFOB:    120000,
    contraparte: 'HP Enterprise US',
    estado:      'APROBADA_CON_CONDICIONES',
    clasificacion: {
      partidaArancelaria:  '8471.50',
      porcentajeConfianza: 91,
      tlcAplicado:         'ALIANZA_PACIFICO',
      montoImpuestos:      0,
      requiereRevision:    false,
    },
  },
];

// -------------------------------------------------------------------
// Parametros del sistema
// -------------------------------------------------------------------
const PARAMETROS_SEED = [
  {
    nombre:      'UMBRAL_CONFIANZA_BRM',
    valor:       '75',
    descripcion: 'Porcentaje minimo de confianza para que el BRM apruebe la clasificacion automaticamente',
  },
  {
    nombre:      'TIEMPO_LIMITE_ALERTAS_HORAS',
    valor:       '24',
    descripcion: 'Horas que puede estar una alerta en estado PENDIENTE antes de escalar a ESCALADA',
  },
];

// -------------------------------------------------------------------
// Funcion principal
// -------------------------------------------------------------------
async function ejecutarSeed() {
  await conectarDB();
  console.log('Iniciando carga de datos...');

  // Limpiar colecciones para garantizar un estado conocido
  await Promise.all([
    Usuario.deleteMany({}),
    Operacion.deleteMany({}),
    ClasificacionArancelaria.deleteMany({}),
    AlertaCumplimiento.deleteMany({}),
    LogAuditoria.deleteMany({}),
    ParametroSistema.deleteMany({}),
  ]);
  console.log('Colecciones limpiadas.');

  // Crear usuarios con contrasenas hasheadas
  const SALT_ROUNDS = 10;
  const usuariosConHash = await Promise.all(
    USUARIOS_SEED.map(async (u) => ({
      ...u,
      password: await bcrypt.hash(u.password, SALT_ROUNDS),
    }))
  );
  const usuariosCreados = await Usuario.insertMany(usuariosConHash);
  console.log(`${usuariosCreados.length} usuarios creados.`);

  // Buscar el ID del usuario AREA_OPERATIVA para asignarlo como registradaPor
  const operativo = usuariosCreados.find((u) => u.rol === 'AREA_OPERATIVA');
  const oficial   = usuariosCreados.find((u) => u.rol === 'OFICIAL_CUMPLIMIENTO');

  // Crear operaciones y sus clasificaciones
  for (const datos of OPERACIONES_SEED) {
    const { clasificacion, ...datosOperacion } = datos;

    const operacion = await Operacion.create({
      ...datosOperacion,
      registradaPor: operativo._id,
    });

    if (clasificacion) {
      // Para operaciones aprobadas, el oficial ya firmo
      const aprobadaPor = ['APROBADA', 'APROBADA_CON_CONDICIONES'].includes(operacion.estado)
        ? oficial._id
        : null;

      await ClasificacionArancelaria.create({
        operacionId: operacion._id,
        aprobadaPor,
        ...clasificacion,
      });
    }

    // Crear alerta para la operacion bloqueada
    if (operacion.estado === 'BLOQUEADA') {
      await AlertaCumplimiento.create({
        operacionId: operacion._id,
        tipo:        'SANCION_DETECTADA',
        estado:      'PENDIENTE',
        descripcion: `Contraparte "${operacion.contraparte}" encontrada en lista OFAC. Operacion bloqueada automaticamente.`,
      });
    }

    // Crear alerta para la operacion que requiere revision manual
    if (operacion.estado === 'REQUIERE_REVISION_MANUAL') {
      await AlertaCumplimiento.create({
        operacionId: operacion._id,
        tipo:        'CLASIFICACION_BAJA_CONFIANZA',
        estado:      'PENDIENTE',
        descripcion: `Confianza del BRM por debajo del umbral. Se requiere clasificacion manual por un Oficial.`,
      });
    }

    // Registrar creacion en el log de auditoria
    await LogAuditoria.create({
      usuarioId: operativo._id,
      accion:    'OPERACION_CREADA',
      entidad:   'Operacion',
      entidadId: operacion._id,
      detalle:   `Operacion "${operacion.producto}" creada con estado inicial ${operacion.estado}`,
    });
  }
  console.log(`${OPERACIONES_SEED.length} operaciones creadas con sus clasificaciones y alertas.`);

  // Insertar parametros de configuracion
  await ParametroSistema.insertMany(PARAMETROS_SEED);
  console.log(`${PARAMETROS_SEED.length} parametros del sistema creados.`);

  // Resumen para la demo
  console.log('\n--- Credenciales de acceso para la demo ---');
  USUARIOS_SEED.forEach((u) => {
    console.log(`  ${u.rol.padEnd(25)} | ${u.email} | password: ${u.password}`);
  });
  console.log('-------------------------------------------\n');

  await mongoose.connection.close();
  console.log('Seed completado. Conexion cerrada.');
  process.exit(0);
}

ejecutarSeed().catch((err) => {
  console.error('Error durante el seed:', err.message);
  process.exit(1);
});
