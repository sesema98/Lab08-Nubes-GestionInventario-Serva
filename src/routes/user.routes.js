const express = require("express");
const { getDb } = require("../db/connection");
const { ROLE_NAMES } = require("../config/constants");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { logAudit } = require("../services/audit.service");
const {
  getUserWithRolesById,
  getUserWithRolesByEmail,
  listUsers,
  listRolesForUser,
} = require("../services/user.service");
const { HttpError } = require("../utils/http-error");
const { hashPassword, validatePasswordStrength } = require("../utils/password");
const { nowIso } = require("../utils/time");
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

function resolveRoleIds(db, roleNames = []) {
  if (!Array.isArray(roleNames) || roleNames.length === 0) {
    return [];
  }

  const ids = roleNames.map((roleName) => {
    const role = db
      .prepare("SELECT id, nombre FROM roles WHERE nombre = ?")
      .get(String(roleName).trim());

    if (!role) {
      throw new HttpError(404, `No existe el rol ${roleName}.`);
    }

    return role.id;
  });

  return [...new Set(ids)];
}

router.use(authenticate);

router.get(
  "/",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (_req, res) => {
    res.json({
      users: listUsers().map(sanitizeUser),
    });
  })
);

router.post(
  "/",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["email", "password", "nombreCompleto", "tiendaId"]);

    const db = getDb();
    const existingUser = getUserWithRolesByEmail(req.body.email);
    if (existingUser) {
      throw new HttpError(409, "El correo electrónico ya está registrado.");
    }

    const store = db
      .prepare("SELECT id FROM tiendas WHERE id = ?")
      .get(parseInteger(req.body.tiendaId, "tiendaId"));
    if (!store) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const passwordErrors = validatePasswordStrength(req.body.password);
    if (passwordErrors.length > 0) {
      throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
    }

    const roleIds = resolveRoleIds(
      db,
      Array.isArray(req.body.roles) && req.body.roles.length > 0
        ? req.body.roles
        : [ROLE_NAMES.EMPLOYEE]
    );

    const createUser = db.transaction(() => {
      const timestamp = nowIso();
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
          parseBoolean(req.body.activo, true) ? 1 : 0,
          0,
          null,
          timestamp
        );

      const assignRole = db.prepare(`
        INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por, fecha_asignacion)
        VALUES (?, ?, ?, ?)
      `);
      roleIds.forEach((roleId) => {
        assignRole.run(result.lastInsertRowid, roleId, req.user.id, timestamp);
      });

      return result.lastInsertRowid;
    });

    const userId = createUser();
    const user = getUserWithRolesById(userId);
    logAudit({
      userId: req.user.id,
      action: "CREATE_USER",
      resource: "usuarios",
      resourceId: String(user.id),
      allowed: true,
      detail: `Usuario ${user.email} creado por administrador.`,
    });

    res.status(201).json({
      message: "Usuario creado correctamente.",
      user: sanitizeUser(user),
    });
  })
);

router.get(
  "/:id",
  wrapRoute(async (req, res) => {
    const targetId = parseInteger(req.params.id, "id");
    if (req.user.id !== targetId && !req.user.roles.includes(ROLE_NAMES.ADMIN)) {
      throw new HttpError(403, "No tienes permisos para ver este usuario.");
    }

    const user = getUserWithRolesById(targetId);
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
    const db = getDb();
    const user = getUserWithRolesById(parseInteger(req.params.id, "id"));
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const updates = [];
    const values = [];

    if (req.body.email !== undefined) {
      const normalizedEmail = String(req.body.email).trim().toLowerCase();
      const existingUser = db
        .prepare("SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?) AND id != ?")
        .get(normalizedEmail, user.id);
      if (existingUser) {
        throw new HttpError(409, "El correo electrónico ya está en uso.");
      }
      updates.push("email = ?");
      values.push(normalizedEmail);
    }

    if (req.body.nombreCompleto !== undefined) {
      updates.push("nombre_completo = ?");
      values.push(String(req.body.nombreCompleto).trim());
    }

    if (req.body.tiendaId !== undefined) {
      const storeId = parseInteger(req.body.tiendaId, "tiendaId");
      const store = db.prepare("SELECT id FROM tiendas WHERE id = ?").get(storeId);
      if (!store) {
        throw new HttpError(404, "La tienda indicada no existe.");
      }
      updates.push("tienda_id = ?");
      values.push(storeId);
    }

    if (req.body.mfaHabilitado !== undefined) {
      updates.push("mfa_habilitado = ?");
      values.push(parseBoolean(req.body.mfaHabilitado) ? 1 : 0);
    }

    if (req.body.activo !== undefined) {
      updates.push("activo = ?");
      values.push(parseBoolean(req.body.activo) ? 1 : 0);
    }

    if (req.body.password !== undefined) {
      const passwordErrors = validatePasswordStrength(req.body.password);
      if (passwordErrors.length > 0) {
        throw new HttpError(400, "La contraseña no cumple los requisitos.", passwordErrors);
      }
      updates.push("password_hash = ?");
      values.push(hashPassword(req.body.password));
    }

    if (updates.length === 0) {
      throw new HttpError(400, "No se enviaron campos para actualizar.");
    }

    values.push(user.id);
    db.prepare(`UPDATE usuarios SET ${updates.join(", ")} WHERE id = ?`).run(...values);

    const updatedUser = getUserWithRolesById(user.id);
    logAudit({
      userId: req.user.id,
      action: "UPDATE_USER",
      resource: "usuarios",
      resourceId: String(user.id),
      allowed: true,
      detail: `Usuario ${updatedUser.email} actualizado.`,
    });

    res.json({
      message: "Usuario actualizado correctamente.",
      user: sanitizeUser(updatedUser),
    });
  })
);

router.delete(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const db = getDb();
    const user = getUserWithRolesById(parseInteger(req.params.id, "id"));
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    db.prepare("UPDATE usuarios SET activo = 0 WHERE id = ?").run(user.id);
    logAudit({
      userId: req.user.id,
      action: "DELETE_USER",
      resource: "usuarios",
      resourceId: String(user.id),
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
    const targetId = parseInteger(req.params.id, "id");
    if (req.user.id !== targetId && !req.user.roles.includes(ROLE_NAMES.ADMIN)) {
      throw new HttpError(403, "No tienes permisos para ver los roles de este usuario.");
    }

    const user = getUserWithRolesById(targetId);
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    res.json({
      userId: user.id,
      roles: listRolesForUser(user.id),
    });
  })
);

router.post(
  "/:id/roles",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["roleName"]);
    const db = getDb();
    const user = getUserWithRolesById(parseInteger(req.params.id, "id"));
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const role = db
      .prepare("SELECT id, nombre FROM roles WHERE nombre = ?")
      .get(String(req.body.roleName).trim());
    if (!role) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    db.prepare(`
      INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por, fecha_asignacion)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(usuario_id, rol_id) DO NOTHING
    `).run(user.id, role.id, req.user.id, nowIso());

    const updatedUser = getUserWithRolesById(user.id);
    logAudit({
      userId: req.user.id,
      action: "ASSIGN_ROLE",
      resource: "usuario_roles",
      resourceId: `${user.id}:${role.id}`,
      allowed: true,
      detail: `Rol ${role.nombre} asignado a ${updatedUser.email}.`,
    });

    res.json({
      message: "Rol asignado correctamente.",
      user: sanitizeUser(updatedUser),
    });
  })
);

router.delete(
  "/:id/roles/:roleId",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const db = getDb();
    const user = getUserWithRolesById(parseInteger(req.params.id, "id"));
    if (!user) {
      throw new HttpError(404, "Usuario no encontrado.");
    }

    const role = db
      .prepare("SELECT id, nombre FROM roles WHERE id = ?")
      .get(parseInteger(req.params.roleId, "roleId"));
    if (!role) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    db.prepare("DELETE FROM usuario_roles WHERE usuario_id = ? AND rol_id = ?").run(
      user.id,
      role.id
    );

    logAudit({
      userId: req.user.id,
      action: "REMOVE_ROLE",
      resource: "usuario_roles",
      resourceId: `${user.id}:${role.id}`,
      allowed: true,
      detail: `Rol ${role.nombre} retirado de ${user.email}.`,
    });

    res.json({
      message: "Rol retirado correctamente.",
      user: sanitizeUser(getUserWithRolesById(user.id)),
    });
  })
);

module.exports = router;
