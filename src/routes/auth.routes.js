const crypto = require("crypto");
const express = require("express");
const env = require("../config/env");
const { ROLE_NAMES } = require("../config/constants");
const { getDb } = require("../db/connection");
const { getUserWithRolesById, getUserWithRolesByEmail } = require("../services/user.service");
const { logAudit } = require("../services/audit.service");
const { sendMfaCode } = require("../services/mail.service");
const { authenticate } = require("../middlewares/auth.middleware");
const { signAccessToken } = require("../utils/jwt");
const { HttpError } = require("../utils/http-error");
const { validatePasswordStrength, hashPassword, comparePassword } = require("../utils/password");
const { nowIso, addMinutes } = require("../utils/time");
const { requireFields, parseBoolean, parseInteger } = require("../utils/validators");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    nombreCompleto: user.nombreCompleto,
    tiendaId: user.tiendaId,
    tienda: user.tienda,
    mfaHabilitado: user.mfaHabilitado,
    activo: user.activo,
    roles: user.roles,
    fechaCreacion: user.fechaCreacion,
  };
}

router.post(
  "/register",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password", "nombreCompleto", "tiendaId"]);

    const db = getDb();
    const passwordErrors = validatePasswordStrength(req.body.password);
    if (passwordErrors.length > 0) {
      throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
    }

    const store = db
      .prepare("SELECT id, nombre FROM tiendas WHERE id = ?")
      .get(parseInteger(req.body.tiendaId, "tiendaId"));
    if (!store) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const existingUser = getUserWithRolesByEmail(req.body.email);
    if (existingUser) {
      throw new HttpError(409, "El correo electrónico ya está registrado.");
    }

    const employeeRole = db
      .prepare("SELECT id FROM roles WHERE nombre = ?")
      .get(ROLE_NAMES.EMPLOYEE);

    const timestamp = nowIso();
    const createUser = db.transaction(() => {
      const result = db
        .prepare(`
          INSERT INTO usuarios (
            email, password_hash, nombre_completo, tienda_id, mfa_habilitado,
            mfa_secret, activo, failed_login_attempts, locked_until, fecha_creacion
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .run(
          String(req.body.email).trim().toLowerCase(),
          hashPassword(req.body.password),
          String(req.body.nombreCompleto).trim(),
          store.id,
          parseBoolean(req.body.mfaHabilitado, true) ? 1 : 0,
          null,
          1,
          0,
          null,
          timestamp
        );

      db.prepare(`
        INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por, fecha_asignacion)
        VALUES (?, ?, ?, ?)
      `).run(result.lastInsertRowid, employeeRole.id, null, timestamp);

      return result.lastInsertRowid;
    });

    const userId = createUser();
    const user = getUserWithRolesById(userId);

    logAudit({
      userId: user.id,
      action: "REGISTER",
      resource: "usuarios",
      resourceId: String(user.id),
      allowed: true,
      detail: "Registro público de usuario con rol Empleado por defecto.",
    });

    res.status(201).json({
      message: "Usuario registrado correctamente.",
      user: sanitizeUser(user),
    });
  })
);

router.post(
  "/login",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password"]);

    const db = getDb();
    const user = getUserWithRolesByEmail(String(req.body.email).trim().toLowerCase());

    if (!user || !user.activo) {
      throw new HttpError(401, "Credenciales inválidas.");
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new HttpError(423, `Usuario bloqueado hasta ${user.lockedUntil}.`);
    }

    const isValidPassword = comparePassword(req.body.password, user.passwordHash);
    if (!isValidPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const isBlocked = attempts >= env.loginMaxAttempts;
      const lockedUntil = isBlocked
        ? addMinutes(new Date(), env.loginLockMinutes).toISOString()
        : null;

      db.prepare(`
        UPDATE usuarios
        SET failed_login_attempts = ?, locked_until = ?
        WHERE id = ?
      `).run(attempts, lockedUntil, user.id);

      logAudit({
        userId: user.id,
        action: "LOGIN",
        resource: "usuarios",
        resourceId: String(user.id),
        allowed: false,
        detail: isBlocked
          ? "Usuario bloqueado por exceso de intentos fallidos."
          : "Credenciales inválidas.",
      });

      if (isBlocked) {
        throw new HttpError(423, `Usuario bloqueado hasta ${lockedUntil}.`);
      }

      throw new HttpError(401, "Credenciales inválidas.");
    }

    db.prepare(`
      UPDATE usuarios
      SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = ?
    `).run(user.id);

    if (!user.mfaHabilitado) {
      const token = signAccessToken(user);
      logAudit({
        userId: user.id,
        action: "LOGIN",
        resource: "usuarios",
        resourceId: String(user.id),
        allowed: true,
        detail: "Inicio de sesión exitoso sin MFA.",
      });

      return res.json({
        message: "Inicio de sesión exitoso.",
        token,
        user: sanitizeUser(getUserWithRolesById(user.id)),
      });
    }

    db.prepare("DELETE FROM mfa_challenges WHERE usuario_id = ?").run(user.id);

    const challengeId = crypto.randomUUID();
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = addMinutes(new Date(), env.mfaCodeTtlMinutes).toISOString();
    const mailboxFile = sendMfaCode({
      to: user.email,
      code,
      challengeId,
      expiresAt,
    });

    db.prepare(`
      INSERT INTO mfa_challenges (
        id, usuario_id, code_hash, expires_at, attempts, consumed, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(challengeId, user.id, hashPassword(code), expiresAt, 0, 0, nowIso());

    logAudit({
      userId: user.id,
      action: "LOGIN_MFA_CHALLENGE",
      resource: "mfa_challenges",
      resourceId: challengeId,
      allowed: true,
      detail: `Código MFA emitido para ${user.email}.`,
    });

    return res.status(202).json({
      message: "Credenciales válidas. Ingresa el código MFA enviado por correo.",
      challengeId,
      expiresAt,
      mailboxFile,
      ...(env.exposeMfaCode ? { debugCode: code } : {}),
    });
  })
);

router.post(
  "/verify-mfa",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["challengeId", "code"]);

    const db = getDb();
    const challenge = db
      .prepare(`
        SELECT mc.*, u.email
        FROM mfa_challenges mc
        INNER JOIN usuarios u ON u.id = mc.usuario_id
        WHERE mc.id = ?
      `)
      .get(req.body.challengeId);

    if (!challenge || challenge.consumed) {
      throw new HttpError(404, "El desafío MFA no existe o ya fue utilizado.");
    }

    if (new Date(challenge.expires_at) < new Date()) {
      db.prepare("UPDATE mfa_challenges SET consumed = 1 WHERE id = ?").run(challenge.id);
      throw new HttpError(401, "El código MFA ha expirado.");
    }

    const isValidCode = comparePassword(String(req.body.code), challenge.code_hash);
    if (!isValidCode) {
      const attempts = challenge.attempts + 1;
      const consumed = attempts >= env.mfaMaxAttempts ? 1 : 0;
      db.prepare(`
        UPDATE mfa_challenges
        SET attempts = ?, consumed = ?
        WHERE id = ?
      `).run(attempts, consumed, challenge.id);

      logAudit({
        userId: challenge.usuario_id,
        action: "LOGIN_MFA_VERIFY",
        resource: "mfa_challenges",
        resourceId: challenge.id,
        allowed: false,
        detail: `Intento MFA inválido. Intento ${attempts}.`,
      });

      throw new HttpError(
        401,
        consumed
          ? "Código MFA inválido. Se agotaron los intentos."
          : "Código MFA inválido."
      );
    }

    db.prepare("UPDATE mfa_challenges SET consumed = 1 WHERE id = ?").run(challenge.id);

    const user = getUserWithRolesById(challenge.usuario_id);
    const token = signAccessToken(user);
    logAudit({
      userId: user.id,
      action: "LOGIN_MFA_VERIFY",
      resource: "mfa_challenges",
      resourceId: challenge.id,
      allowed: true,
      detail: "MFA validado correctamente.",
    });

    res.json({
      message: "MFA validado correctamente.",
      token,
      user: sanitizeUser(user),
    });
  })
);

router.get(
  "/me",
  authenticate,
  wrapRoute(async (req, res) => {
    res.json({
      user: sanitizeUser(req.user),
    });
  })
);

module.exports = router;
