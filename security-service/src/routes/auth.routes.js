const crypto = require("crypto");
const express = require("express");
const QRCode = require("qrcode");
const { authenticator } = require("otplib");
const env = require("../config/env");
const { query, withTransaction } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { logAudit } = require("../services/audit.service");
const { sendMfaEmail } = require("../services/email.service");
const { getUserWithRolesById, getUserWithRolesByEmail } = require("../services/user.service");
const { HttpError } = require("../utils/http-error");
const { signAccessToken } = require("../utils/jwt");
const { comparePassword, hashPassword, validatePasswordStrength } = require("../utils/password");
const { wrapRoute } = require("../utils/route");
const { addMinutes, now } = require("../utils/time");
const { parseBoolean, parseInteger, requireFields } = require("../utils/validators");

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    storeId: user.storeId,
    store: user.store,
    mfaEmailEnabled: user.mfaEmailEnabled,
    mfaTotpEnabled: user.mfaTotpEnabled,
    active: user.active,
    roles: user.roles,
    createdAt: user.createdAt,
  };
}

async function buildTotpSetup(email, secret) {
  const otpauthUrl = authenticator.keyuri(email, env.totpIssuer, secret);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
  return {
    secret,
    otpauthUrl,
    qrCodeDataUrl,
  };
}

function getAvailableMethods(user) {
  const methods = [];
  if (user.mfaTotpEnabled && user.mfaTotpSecret) {
    methods.push("totp");
  }
  if (user.mfaEmailEnabled) {
    methods.push("email");
  }
  return methods;
}

async function issueEmailChallenge(challenge) {
  if (!challenge.available_methods.includes("email")) {
    throw new HttpError(403, "El usuario no tiene MFA por email habilitado.");
  }

  const code = String(crypto.randomInt(100000, 1000000));
  const emailCodeHash = await hashPassword(code);
  const emailCodeExpiresAt = addMinutes(now(), env.mfaChallengeTtlMinutes);

  await query(
    `
      UPDATE login_challenges
      SET selected_method = 'email',
          email_code_hash = $2,
          email_code_expires_at = $3
      WHERE id = $1
    `,
    [challenge.id, emailCodeHash, emailCodeExpiresAt]
  );

  const delivery = await sendMfaEmail({
    to: challenge.email,
    code,
    challengeId: challenge.id,
    expiresAt: emailCodeExpiresAt.toISOString(),
  });

  await logAudit({
    userId: challenge.user_id,
    action: "LOGIN_MFA_EMAIL_SEND",
    resource: "login_challenges",
    resourceId: challenge.id,
    allowed: true,
    detail: `Código MFA por email enviado en modo ${delivery.mode}.`,
  });

  return {
    delivery,
    expiresAt: emailCodeExpiresAt.toISOString(),
  };
}

router.post(
  "/register",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password", "fullName", "storeId"]);

    if (req.body.enableEmailMfa !== undefined || req.body.enableTotpMfa !== undefined) {
      throw new HttpError(
        400,
        "Configura MFA desde tu cuenta después del primer inicio de sesión."
      );
    }

    const passwordErrors = validatePasswordStrength(req.body.password);
    if (passwordErrors.length > 0) {
      throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
    }

    const storeId = parseInteger(req.body.storeId, "storeId");
    const existingUser = await getUserWithRolesByEmail(req.body.email);
    if (existingUser) {
      throw new HttpError(409, "El correo electrónico ya está registrado.");
    }

    const store = await query("SELECT id, name FROM stores WHERE id = $1", [storeId]);
    if (store.rowCount === 0) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const hashedPassword = await hashPassword(req.body.password);

    const createdUserId = await withTransaction(async (client) => {
      const userResult = await client.query(
        `
          INSERT INTO users (
            email,
            password_hash,
            full_name,
            store_id,
            mfa_email_enabled,
            mfa_totp_enabled,
            mfa_totp_secret,
            active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
          RETURNING id
        `,
        [
          String(req.body.email).trim().toLowerCase(),
          hashedPassword,
          String(req.body.fullName).trim(),
          storeId,
          false,
          false,
          null,
        ]
      );

      const employeeRole = await client.query(
        "SELECT id FROM roles WHERE name = 'Empleado'"
      );

      await client.query(
        `
          INSERT INTO user_roles (user_id, role_id, assigned_by)
          VALUES ($1, $2, NULL)
        `,
        [userResult.rows[0].id, employeeRole.rows[0].id]
      );

      return userResult.rows[0].id;
    });

    const user = await getUserWithRolesById(createdUserId);
    await logAudit({
      userId: user.id,
      action: "REGISTER",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: "Registro público con rol Empleado por defecto.",
    });

    res.status(201).json({
      message: "Usuario registrado correctamente.",
      user: sanitizeUser(user),
      nextStep:
        "Inicia sesión y activa MFA desde el apartado Autenticación de tu cuenta.",
    });
  })
);

router.post(
  "/login",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password"]);

    const user = await getUserWithRolesByEmail(String(req.body.email).trim().toLowerCase());
    if (!user || !user.active) {
      throw new HttpError(401, "Credenciales inválidas.");
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      throw new HttpError(423, `Usuario bloqueado hasta ${user.lockedUntil}.`);
    }

    const isValidPassword = await comparePassword(req.body.password, user.passwordHash);
    if (!isValidPassword) {
      const attempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        attempts >= env.loginMaxAttempts
          ? addMinutes(now(), env.loginLockMinutes)
          : null;

      await query(
        `
          UPDATE users
          SET failed_login_attempts = $1, locked_until = $2
          WHERE id = $3
        `,
        [attempts, lockedUntil, user.id]
      );

      await logAudit({
        userId: user.id,
        action: "LOGIN",
        resource: "users",
        resourceId: String(user.id),
        allowed: false,
        detail: lockedUntil
          ? "Usuario bloqueado por exceso de intentos fallidos."
          : "Credenciales inválidas.",
      });

      if (lockedUntil) {
        throw new HttpError(423, `Usuario bloqueado hasta ${lockedUntil.toISOString()}.`);
      }

      throw new HttpError(401, "Credenciales inválidas.");
    }

    await query(
      `
        UPDATE users
        SET failed_login_attempts = 0, locked_until = NULL
        WHERE id = $1
      `,
      [user.id]
    );

    const availableMethods = getAvailableMethods(user);
    if (availableMethods.length === 0) {
      const token = signAccessToken(user);
      await logAudit({
        userId: user.id,
        action: "LOGIN",
        resource: "users",
        resourceId: String(user.id),
        allowed: true,
        detail: "Inicio de sesión exitoso sin MFA.",
      });

      return res.json({
        message: "Inicio de sesión exitoso.",
        token,
        user: sanitizeUser(await getUserWithRolesById(user.id)),
      });
    }

    const challengeId = crypto.randomUUID();
    const expiresAt = addMinutes(now(), env.mfaChallengeTtlMinutes);

    await query(
      `
        INSERT INTO login_challenges (
          id,
          user_id,
          available_methods,
          expires_at
        )
        VALUES ($1, $2, $3, $4)
      `,
      [challengeId, user.id, availableMethods, expiresAt]
    );

    await logAudit({
      userId: user.id,
      action: "LOGIN_MFA_REQUIRED",
      resource: "login_challenges",
      resourceId: challengeId,
      allowed: true,
      detail: `Métodos disponibles: ${availableMethods.join(", ")}.`,
    });

    if (availableMethods.length === 1 && availableMethods[0] === "email") {
      const delivery = await issueEmailChallenge({
        id: challengeId,
        user_id: user.id,
        email: user.email,
        available_methods: availableMethods,
      });

      return res.status(202).json({
        message: "Credenciales válidas. Ingresa el OTP enviado por email.",
        mfaRequired: true,
        challengeId,
        availableMethods,
        challengeExpiresAt: expiresAt.toISOString(),
        autoDelivery: delivery,
      });
    }

    res.status(202).json({
      message: "Credenciales válidas. Selecciona un método MFA.",
      mfaRequired: true,
      challengeId,
      availableMethods,
      challengeExpiresAt: expiresAt.toISOString(),
    });
  })
);

router.post(
  "/mfa/email/send",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["challengeId"]);

    const result = await query(
      `
        SELECT
          lc.*,
          u.email
        FROM login_challenges lc
        INNER JOIN users u ON u.id = lc.user_id
        WHERE lc.id = $1
      `,
      [req.body.challengeId]
    );

    const challenge = result.rows[0];
    if (!challenge || challenge.consumed) {
      throw new HttpError(404, "El challenge MFA no existe o ya fue utilizado.");
    }
    if (new Date(challenge.expires_at) < new Date()) {
      await query("UPDATE login_challenges SET consumed = TRUE WHERE id = $1", [challenge.id]);
      throw new HttpError(401, "El challenge MFA ha expirado.");
    }
    const delivery = await issueEmailChallenge(challenge);

    res.json({
      message: "Código MFA procesado para el método email.",
      delivery: delivery.delivery,
      challengeId: challenge.id,
      expiresAt: delivery.expiresAt,
    });
  })
);

router.post(
  "/mfa/verify",
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["challengeId", "method", "code"]);

    const challengeResult = await query(
      `
        SELECT lc.*, u.email, u.mfa_totp_secret, u.mfa_totp_enabled
        FROM login_challenges lc
        INNER JOIN users u ON u.id = lc.user_id
        WHERE lc.id = $1
      `,
      [req.body.challengeId]
    );

    const challenge = challengeResult.rows[0];
    if (!challenge || challenge.consumed) {
      throw new HttpError(404, "El challenge MFA no existe o ya fue utilizado.");
    }
    if (new Date(challenge.expires_at) < new Date()) {
      await query("UPDATE login_challenges SET consumed = TRUE WHERE id = $1", [challenge.id]);
      throw new HttpError(401, "El challenge MFA ha expirado.");
    }

    const method = String(req.body.method).trim().toLowerCase();
    if (!challenge.available_methods.includes(method)) {
      throw new HttpError(403, "El método MFA seleccionado no está habilitado.");
    }

    let valid = false;
    if (method === "email") {
      if (!challenge.email_code_hash || !challenge.email_code_expires_at) {
        throw new HttpError(400, "Primero debes solicitar el código por email.");
      }
      if (new Date(challenge.email_code_expires_at) < new Date()) {
        throw new HttpError(401, "El código MFA por email expiró.");
      }
      valid = await comparePassword(String(req.body.code), challenge.email_code_hash);
    } else if (method === "totp") {
      if (!challenge.mfa_totp_enabled || !challenge.mfa_totp_secret) {
        throw new HttpError(403, "El usuario no tiene TOTP habilitado.");
      }
      valid = authenticator.check(String(req.body.code), challenge.mfa_totp_secret);
    } else {
      throw new HttpError(400, "Método MFA no soportado.");
    }

    if (!valid) {
      const attempts = challenge.attempts + 1;
      const consumed = attempts >= env.mfaMaxAttempts;
      await query(
        `
          UPDATE login_challenges
          SET attempts = $2, consumed = $3
          WHERE id = $1
        `,
        [challenge.id, attempts, consumed]
      );

      await logAudit({
        userId: challenge.user_id,
        action: "LOGIN_MFA_VERIFY",
        resource: "login_challenges",
        resourceId: challenge.id,
        allowed: false,
        detail: `Método ${method} inválido. Intento ${attempts}.`,
      });

      throw new HttpError(
        401,
        consumed
          ? "Código MFA inválido. Se agotaron los intentos."
          : "Código MFA inválido."
      );
    }

    await query("UPDATE login_challenges SET consumed = TRUE WHERE id = $1", [challenge.id]);
    const user = await getUserWithRolesById(challenge.user_id);
    const token = signAccessToken(user);

    await logAudit({
      userId: user.id,
      action: "LOGIN_MFA_VERIFY",
      resource: "login_challenges",
      resourceId: challenge.id,
      allowed: true,
      detail: `MFA validado correctamente con método ${method}.`,
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

router.put(
  "/mfa/email",
  authenticate,
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["enabled"]);

    const enabled = parseBoolean(req.body.enabled);
    await query(
      `
        UPDATE users
        SET mfa_email_enabled = $2
        WHERE id = $1
      `,
      [req.user.id, enabled]
    );

    const user = await getUserWithRolesById(req.user.id);
    await logAudit({
      userId: user.id,
      action: "MFA_EMAIL_UPDATE",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: `MFA por email ${enabled ? "habilitado" : "deshabilitado"} por el usuario.`,
    });

    res.json({
      message: `MFA por email ${enabled ? "habilitado" : "deshabilitado"} correctamente.`,
      user: sanitizeUser(user),
    });
  })
);

router.post(
  "/mfa/totp/setup",
  authenticate,
  wrapRoute(async (req, res) => {
    const user = await getUserWithRolesById(req.user.id);
    if (!user || !user.active) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const secret = authenticator.generateSecret();
    await query(
      `
        UPDATE users
        SET mfa_totp_enabled = FALSE,
            mfa_totp_secret = $2
        WHERE id = $1
      `,
      [user.id, secret]
    );

    await logAudit({
      userId: user.id,
      action: "MFA_TOTP_SETUP",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: "Se generó un nuevo QR TOTP para enrolamiento.",
    });

    res.json({
      message: "Escanea el QR y confirma un OTP para activar TOTP.",
      mfaSetup: {
        totp: await buildTotpSetup(user.email, secret),
      },
    });
  })
);

router.post(
  "/mfa/totp/confirm",
  authenticate,
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["code"]);

    const user = await getUserWithRolesById(req.user.id);
    if (!user || !user.active) {
      throw new HttpError(404, "Usuario no encontrado.");
    }
    if (!user.mfaTotpSecret) {
      throw new HttpError(400, "Primero debes generar el QR TOTP.");
    }

    const code = String(req.body.code).trim();
    const valid = authenticator.check(code, user.mfaTotpSecret);
    if (!valid) {
      await logAudit({
        userId: user.id,
        action: "MFA_TOTP_CONFIRM",
        resource: "users",
        resourceId: String(user.id),
        allowed: false,
        detail: "OTP TOTP inválido durante la activación.",
      });
      throw new HttpError(401, "El OTP TOTP es inválido.");
    }

    await query(
      `
        UPDATE users
        SET mfa_totp_enabled = TRUE
        WHERE id = $1
      `,
      [user.id]
    );

    const updated = await getUserWithRolesById(user.id);
    await logAudit({
      userId: user.id,
      action: "MFA_TOTP_CONFIRM",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: "TOTP activado correctamente por el usuario.",
    });

    res.json({
      message: "OTP con app activado correctamente.",
      user: sanitizeUser(updated),
    });
  })
);

router.delete(
  "/mfa/totp",
  authenticate,
  wrapRoute(async (req, res) => {
    const user = await getUserWithRolesById(req.user.id);
    if (!user || !user.active) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    await query(
      `
        UPDATE users
        SET mfa_totp_enabled = FALSE,
            mfa_totp_secret = NULL
        WHERE id = $1
      `,
      [user.id]
    );

    const updated = await getUserWithRolesById(user.id);
    await logAudit({
      userId: user.id,
      action: "MFA_TOTP_DISABLE",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: "TOTP deshabilitado por el usuario.",
    });

    res.json({
      message: "OTP con app deshabilitado correctamente.",
      user: sanitizeUser(updated),
    });
  })
);

module.exports = router;
