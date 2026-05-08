const bcrypt = require("bcryptjs");

function validatePasswordStrength(password) {
  const errors = [];

  if (typeof password !== "string" || password.length < 8) {
    errors.push("La contraseña debe tener al menos 8 caracteres.");
  }
  if (!/[A-Z]/.test(password || "")) {
    errors.push("La contraseña debe incluir al menos una mayúscula.");
  }
  if (!/[0-9]/.test(password || "")) {
    errors.push("La contraseña debe incluir al menos un número.");
  }
  if (!/[^A-Za-z0-9]/.test(password || "")) {
    errors.push("La contraseña debe incluir al menos un carácter especial.");
  }

  return errors;
}

function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

module.exports = {
  validatePasswordStrength,
  hashPassword,
  comparePassword,
};
