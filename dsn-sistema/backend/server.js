/**
 * Punto de entrada del servidor DSN.
 *
 * Responsabilidades:
 *  1. Cargar variables de entorno desde .env
 *  2. Conectar a MongoDB
 *  3. Configurar Express (CORS, JSON parser, rutas)
 *  4. Levantar el servidor HTTP
 *
 * Las rutas se agregan aqui a medida que se implementan los modulos.
 * El orden de los middleware importa: CORS y JSON deben ir antes de las rutas.
 */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const conectarDB = require('./src/config/db');

const app  = express();
const PORT = process.env.PORT || 5000;

// --- Conexion a la base de datos ---
// Se ejecuta antes de que el servidor acepte peticiones
conectarDB();

// --- Middleware global ---

// Permite peticiones desde el frontend (http://localhost:5173 en desarrollo con Vite)
app.use(cors({
  origin: process.env.NODE_ENV === 'development' ? '*' : 'https://tu-dominio.com',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));

// Interpreta el cuerpo de las peticiones como JSON
app.use(express.json());

// --- Ruta raiz ---
// Respuesta informativa para quien visite http://localhost:5000 directamente
app.get('/', (req, res) => {
  res.json({
    sistema:  'DSN - Sistema de Gestión de Riesgos y Cumplimiento Legal',
    version:  '1.0.0',
    estado:   'en línea',
    nota:     'Esta es la API REST. El frontend debe apuntar a /api/*',
    endpoints: {
      health:      'GET  /api/health',
      login:       'POST /api/auth/login',
      perfil:      'GET  /api/auth/me',
      operaciones: 'GET  /api/operaciones',
      alertas:     'GET  /api/alertas',
      auditoria:   'GET  /api/auditoria',
      parametros:  'GET  /api/parametros',
    },
  });
});

// --- Ruta de comprobacion (health check) ---
// Permite verificar que el servidor esta corriendo sin necesitar autenticacion
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mensaje: 'API DSN funcionando correctamente',
    entorno: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// --- Rutas de la API ---
app.use('/api/auth',        require('./src/routes/auth.routes'));
app.use('/api/operaciones', require('./src/routes/operaciones.routes'));
app.use('/api/alertas',     require('./src/routes/alertas.routes'));
app.use('/api/auditoria',   require('./src/routes/auditoria.routes'));
app.use('/api/parametros',  require('./src/routes/parametros.routes'));

// --- Manejador de rutas no encontradas ---
// Cualquier ruta que no coincida con las definidas arriba llega aqui
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// --- Manejador de errores global ---
// Express llama a este middleware cuando algun handler llama a next(error)
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err.message);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// --- Inicio del servidor ---
app.listen(PORT, () => {
  console.log(`Servidor DSN corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
