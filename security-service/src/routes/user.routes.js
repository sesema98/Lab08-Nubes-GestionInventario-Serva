const express = require("express");
const { query, withTransaction } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { logAudit } = require("../services/audit.service");
const {
  getUserWithRolesByEmail,
  getUserWithRolesById,
  listRolesForUser,
  listUsers,
} = require("../services/user.service");
const { HttpError } = require("../utils/http-error");
const { hashPassword, validatePasswordStrength } = require("../utils/password");
const { ROLE_NAMES } = require("../utils/policy-engine");
const { wrapRoute } = require("../utils/route");
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

async function resolveRoleIds(roleNames, client) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) {
    return [];
  }

  const ids = [];
  for (const roleName of roleNames) {
    const result = await client.query("SELECT id FROM roles WHERE name = $1", [
      String(roleName).trim(),
    ]);
    if (result.rowCount === 0) {
      throw new HttpError(404, `No existe el rol ${roleName}.`);
    }
    ids.push(result.rows[0].id);
  }

  return [...new Set(ids)];
}

router.use(authenticate);

router.get(
  "/",
  requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.AUDITOR),
  wrapRoute(async (_req, res) => {
    res.json({
      users: (await listUsers()).map(sanitizeUser),
    });
  })
);

router.post(
  "/",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password", "fullName", "storeId"]);

    if (req.body.enableEmailMfa !== undefined || req.body.enableTotpMfa !== undefined) {
      throw new HttpError(
        400,
        "Cada usuario debe configurar MFA desde su propia cuenta."
      );
    }

    const existing = await getUserWithRolesByEmail(req.body.email);
    if (existing) {
      throw new HttpError(409, "El correo electrónico ya está registrado.");
    }

    const passwordErrors = validatePasswordStrength(req.body.password);
    if (passwordErrors.length > 0) {
      throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
    }

    const storeId = parseInteger(req.body.storeId, "storeId");
    const store = await query("SELECT id FROM stores WHERE id = $1", [storeId]);
    if (store.rowCount === 0) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const roleNames =
      Array.isArray(req.body.roles) && req.body.roles.length > 0
        ? req.body.roles
        : [ROLE_NAMES.EMPLOYEE];

    const userId = await withTransaction(async (client) => {
      const roleIds = await resolveRoleIds(roleNames, client);
      const hashedPassword = await hashPassword(req.body.password);
      const created = await client.query(
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          parseBoolean(req.body.active, true),
        ]
      );

      for (const roleId of roleIds) {
        await client.query(
          `
            INSERT INTO user_roles (user_id, role_id, assigned_by)
            VALUES ($1, $2, $3)
          `,
          [created.rows[0].id, roleId, req.user.id]
        );
      }

      return created.rows[0].id;
    });

    const user = await getUserWithRolesById(userId);
    await logAudit({
      userId: req.user.id,
      action: "CREATE_USER",
      resource: "users",
      resourceId: String(user.id),
      allowed: true,
      detail: `Usuario ${user.email} creado por administrador.`,
    });

    res.status(201).json({
      message: "Usuario creado correctamente.",
      user: sanitizeUser(user),
      nextStep:
        "El usuario debe iniciar sesión y activar MFA desde el módulo de Autenticación.",
    });
  })
);

router.get(
  "/:id",
  wrapRoute(async (req, res) => {
    const userId = parseInteger(req.params.id, "id");
    if (
      req.user.id !== userId &&
      !req.user.roles.includes(ROLE_NAMES.ADMIN) &&
      !req.user.roles.includes(ROLE_NAMES.AUDITOR)
    ) {
      throw new HttpError(403, "No tienes permisos para ver este usuario.");
    }

    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    res.json({ user: sanitizeUser(user) });
  })
);

router.put(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const userId = parseInteger(req.params.id, "id");
    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    if (req.body.enableEmailMfa !== undefined || req.body.enableTotpMfa !== undefined) {
      throw new HttpError(
        400,
        "Cada usuario debe activar o desactivar MFA desde su propia cuenta."
      );
    }

    const updates = [];
    const values = [];
    let nextIndex = 2;

    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      const existing = await query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2",
        [email, userId]
      );
      if (existing.rowCount > 0) {
        throw new HttpError(409, "El correo electrónico ya está en uso.");
      }
      updates.push(`email = $${nextIndex++}`);
      values.push(email);
    }

    if (req.body.fullName !== undefined) {
      updates.push(`full_name = $${nextIndex++}`);
      values.push(String(req.body.fullName).trim());
    }

    if (req.body.storeId !== undefined) {
      const storeId = parseInteger(req.body.storeId, "storeId");
      const store = await query("SELECT id FROM stores WHERE id = $1", [storeId]);
      if (store.rowCount === 0) {
        throw new HttpError(404, "La tienda indicada no existe.");
      }
      updates.push(`store_id = $${nextIndex++}`);
      values.push(storeId);
    }

    if (req.body.active !== undefined) {
      updates.push(`active = $${nextIndex++}`);
      values.push(parseBoolean(req.body.active));
    }

    if (req.body.password !== undefined) {
      const passwordErrors = validatePasswordStrength(req.body.password);
      if (passwordErrors.length > 0) {
        throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
      }
      updates.push(`password_hash = $${nextIndex++}`);
      values.push(await hashPassword(req.body.password));
    }

    if (updates.length === 0) {
      throw new HttpError(400, "No se enviaron campos para actualizar.");
    }

    await query(
      `
        UPDATE users
        SET ${updates.join(", ")}
        WHERE id = $1
      `,
      [userId, ...values]
    );

    const updated = await getUserWithRolesById(userId);
    await logAudit({
      userId: req.user.id,
      action: "UPDATE_USER",
      resource: "users",
      resourceId: String(userId),
      allowed: true,
      detail: `Usuario ${updated.email} actualizado.`,
    });

    res.json({
      message: "Usuario actualizado correctamente.",
      user: sanitizeUser(updated),
    });
  })
);

router.delete(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const userId = parseInteger(req.params.id, "id");
    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    await query("UPDATE users SET active = FALSE WHERE id = $1", [userId]);
    await logAudit({
      userId: req.user.id,
      action: "DELETE_USER",
      resource: "users",
      resourceId: String(userId),
      allowed: true,
      detail: `Usuario ${user.email} desactivado.`,
    });

    res.json({
      message: "Usuario desactivado correctamente.",
    });
  })
);

router.get(
  "/:id/roles",
  wrapRoute(async (req, res) => {
    const userId = parseInteger(req.params.id, "id");
    if (
      req.user.id !== userId &&
      !req.user.roles.includes(ROLE_NAMES.ADMIN) &&
      !req.user.roles.includes(ROLE_NAMES.AUDITOR)
    ) {
      throw new HttpError(403, "No tienes permisos para ver los roles de este usuario.");
    }

    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    res.json({
      userId,
      roles: await listRolesForUser(userId),
    });
  })
);

router.post(
  "/:id/roles",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["roleName"]);
    const userId = parseInteger(req.params.id, "id");
    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const role = await query("SELECT id, name FROM roles WHERE name = $1", [
      String(req.body.roleName).trim(),
    ]);
    if (role.rowCount === 0) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    await query(
      `
        INSERT INTO user_roles (user_id, role_id, assigned_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `,
      [userId, role.rows[0].id, req.user.id]
    );

    await logAudit({
      userId: req.user.id,
      action: "ASSIGN_ROLE",
      resource: "user_roles",
      resourceId: `${userId}:${role.rows[0].id}`,
      allowed: true,
      detail: `Rol ${role.rows[0].name} asignado a ${user.email}.`,
    });

    res.json({
      message: "Rol asignado correctamente.",
      user: sanitizeUser(await getUserWithRolesById(userId)),
    });
  })
);

router.delete(
  "/:id/roles/:roleId",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const userId = parseInteger(req.params.id, "id");
    const roleId = parseInteger(req.params.roleId, "roleId");
    const user = await getUserWithRolesById(userId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const role = await query("SELECT id, name FROM roles WHERE id = $1", [roleId]);
    if (role.rowCount === 0) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    await query("DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2", [
      userId,
      roleId,
    ]);

    await logAudit({
      userId: req.user.id,
      action: "REMOVE_ROLE",
      resource: "user_roles",
      resourceId: `${userId}:${roleId}`,
      allowed: true,
      detail: `Rol ${role.rows[0].name} retirado de ${user.email}.`,
    });

    res.json({
      message: "Rol retirado correctamente.",
      user: sanitizeUser(await getUserWithRolesById(userId)),
    });
  })
);

module.exports = router;
