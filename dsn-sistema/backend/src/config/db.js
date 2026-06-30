/**
 * Modulo de conexion a MongoDB.
 *
 * Exporta una funcion asincrona que establece la conexion usando Mongoose.
 * El servidor llama a esta funcion al arrancar; si falla, el proceso termina
 * porque el sistema no puede operar sin base de datos.
 */

const mongoose = require('mongoose');

/**
 * Conecta la aplicacion a MongoDB.
 * La URI se lee del archivo .env para no exponer credenciales en el codigo.
 */
async function conectarDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB conectado: ${mongoose.connection.host}`);
  } catch (error) {
    console.error('Error al conectar con MongoDB:', error.message);
    // Sin base de datos el sistema no puede funcionar, se detiene el proceso
    process.exit(1);
  }
}

module.exports = conectarDB;
