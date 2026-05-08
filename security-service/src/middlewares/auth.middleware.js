const { HttpError } = require("../utils/http-error");
const { verifyAccessToken } = require("../utils/jwt");
const { getUserWithRolesById } = require("../services/user.service");

async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
      throw new HttpError(401, "Token de acceso no proporcionado.");
    }

    const token = header.slice("Bearer ".length);
    const payload = verifyAccessToken(token);
    const user = await getUserWithRolesById(payload.sub);

    if (!user || !user.active) {
      throw new HttpError(401, "El usuario autenticado no está disponible.");
    }

    req.user = user;
    next();
  } catch (error) {
    next(new HttpError(401, "Token inválido o expirado.", error.message));
  }
}

module.exports = {
  authenticate,
};
