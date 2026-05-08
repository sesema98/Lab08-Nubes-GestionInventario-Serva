const { HttpError } = require("./http-error");

function requireFields(payload, fields) {
  const missing = fields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || value === "";
  });

  if (missing.length > 0) {
    throw new HttpError(
      400,
      `Faltan campos requeridos: ${missing.join(", ")}.`
    );
  }
}

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  if (value === 0 || value === "0" || value === "false") {
    return false;
  }

  throw new HttpError(400, "No se pudo interpretar un valor booleano.");
}

function parseInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new HttpError(400, `El campo ${fieldName} debe ser un entero.`);
  }
  return parsed;
}

function parseNumber(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new HttpError(400, `El campo ${fieldName} debe ser numérico.`);
  }
  return parsed;
}

module.exports = {
  requireFields,
  parseBoolean,
  parseInteger,
  parseNumber,
};
