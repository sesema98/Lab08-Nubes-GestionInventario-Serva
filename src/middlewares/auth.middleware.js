const { verifyAccessToken } = require("../utils/jwt");
const { HttpError } = require("../utils/http-error");
const { getUserWithRolesById } = require("../services/user.service");

function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpError(401, "Token de acceso no proporcionado.");
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const user = getUserWithRolesById(payload.sub);

    if (!user || !user.activo) {
      throw new HttpError(401, "El usuario autenticado no está disponible.");
    }

    req.user = user;
    next();
  } catch (_error) {
    next(new HttpError(401, "Token inválido o expirado."));
  }
}

module.exports = {
  authenticate,
};
