/**
 * Middleware de control de acceso basado en roles (RBAC).
 *
 * Debe usarse siempre despues de verificarToken, porque depende de req.usuario.
 *
 * Uso en rutas:
 *   router.patch('/aprobar', verificarToken, permitirRoles('OFICIAL_CUMPLIMIENTO'), handler);
 *   router.get('/auditoria', verificarToken, permitirRoles('AREA_AUDITORIA', 'ADMINISTRADOR'), handler);
 *
 * La tabla completa de permisos esta en la seccion 9 del PLAN_DESARROLLO_DSN.md.
 */

/**
 * Fabrica de middleware que restringe el acceso a los roles indicados.
 *
 * @param {...string} rolesPermitidos - Uno o mas roles que pueden acceder al recurso
 * @returns {Function} Middleware de Express
 */
function permitirRoles(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      // Defensa en profundidad: no deberia ocurrir si verificarToken va antes
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'No tiene permisos para realizar esta accion',
        rolRequerido: rolesPermitidos,
        rolActual: req.usuario.rol,
      });
    }

    next();
  };
}

module.exports = { permitirRoles };
