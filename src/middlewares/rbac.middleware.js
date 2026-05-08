const { HttpError } = require("../utils/http-error");

function requireRole(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new HttpError(401, "Usuario no autenticado."));
    }

    const isAllowed = req.user.roles.some((role) => allowedRoles.includes(role));

    if (!isAllowed) {
      return next(new HttpError(403, "No tienes permisos para realizar esta acción."));
    }

    return next();
  };
}

module.exports = {
  requireRole,
};
