/**
 * Modelo de usuario del sistema.
 *
 * Representa a cualquier persona que puede iniciar sesion.
 * El rol determina que acciones puede realizar (ver RBAC en roles.middleware.js).
 * La contrasena se guarda como hash bcrypt; nunca en texto plano.
 */

const { Schema, model } = require('mongoose');

const ROLES_VALIDOS = [
  'OFICIAL_CUMPLIMIENTO',
  'AREA_LEGAL',
  'AREA_OPERATIVA',
  'AREA_AUDITORIA',
  'ADMINISTRADOR',
];

const UsuarioSchema = new Schema(
  {
    nombre:   { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
    // El campo password almacena el hash generado por bcryptjs, nunca la clave en claro
    password: { type: String, required: true },
    rol:      { type: String, enum: ROLES_VALIDOS, required: true },
    activo:   { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Evita exponer el hash de contrasena en respuestas JSON
UsuarioSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = model('Usuario', UsuarioSchema);
