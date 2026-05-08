const { HttpError } = require("../utils/http-error");

function notFoundHandler(_req, _res, next) {
  next(new HttpError(404, "Ruta no encontrada."));
}

function errorHandler(error, _req, res, _next) {
  const status = error.status || 500;
  res.status(status).json({
    error: error.message || "Error interno del servidor.",
    details: error.details,
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
