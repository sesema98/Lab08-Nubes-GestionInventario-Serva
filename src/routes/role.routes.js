const express = require("express");
const { ROLE_NAMES } = require("../config/constants");
const { getDb } = require("../db/connection");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { logAudit } = require("../services/audit.service");
const { HttpError } = require("../utils/http-error");
const { requireFields } = require("../utils/validators");
const { nowIso } = require("../utils/time");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  wrapRoute(async (_req, res) => {
    const db = getDb();
    const roles = db.prepare("SELECT * FROM roles ORDER BY id").all();
    res.json({ roles });
  })
);

router.get(
  "/:id",
  wrapRoute(async (req, res) => {
    const db = getDb();
    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(req.params.id);
    if (!role) {
      throw new HttpError(404, "Rol no encontrado.");
    }
    res.json({ role });
  })
);

router.post(
  "/",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["nombre", "descripcion"]);
    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM roles WHERE LOWER(nombre) = LOWER(?)")
      .get(String(req.body.nombre).trim());
    if (existing) {
      throw new HttpError(409, "Ya existe un rol con ese nombre.");
    }

    const result = db.prepare(`
      INSERT INTO roles (nombre, descripcion, fecha_creacion)
      VALUES (?, ?, ?)
    `).run(String(req.body.nombre).trim(), String(req.body.descripcion).trim(), nowIso());

    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(result.lastInsertRowid);
    logAudit({
      userId: req.user.id,
      action: "CREATE_ROLE",
      resource: "roles",
      resourceId: String(role.id),
      allowed: true,
      detail: `Rol ${role.nombre} creado.`,
    });

    res.status(201).json({
      message: "Rol creado correctamente.",
      role,
    });
  })
);

router.put(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["nombre", "descripcion"]);
    const db = getDb();
    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(req.params.id);
    if (!role) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    db.prepare(`
      UPDATE roles
      SET nombre = ?, descripcion = ?
      WHERE id = ?
    `).run(String(req.body.nombre).trim(), String(req.body.descripcion).trim(), req.params.id);

    const updatedRole = db.prepare("SELECT * FROM roles WHERE id = ?").get(req.params.id);
    logAudit({
      userId: req.user.id,
      action: "UPDATE_ROLE",
      resource: "roles",
      resourceId: String(updatedRole.id),
      allowed: true,
      detail: `Rol ${updatedRole.nombre} actualizado.`,
    });

    res.json({
      message: "Rol actualizado correctamente.",
      role: updatedRole,
    });
  })
);

router.delete(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const db = getDb();
    const role = db.prepare("SELECT * FROM roles WHERE id = ?").get(req.params.id);
    if (!role) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    const assignedUsers = db
      .prepare("SELECT COUNT(*) AS total FROM usuario_roles WHERE rol_id = ?")
      .get(req.params.id).total;

    if (assignedUsers > 0) {
      throw new HttpError(409, "No se puede eliminar un rol con usuarios asignados.");
    }

    db.prepare("DELETE FROM roles WHERE id = ?").run(req.params.id);
    logAudit({
      userId: req.user.id,
      action: "DELETE_ROLE",
      resource: "roles",
      resourceId: String(req.params.id),
      allowed: true,
      detail: `Rol ${role.nombre} eliminado.`,
    });

    res.json({
      message: "Rol eliminado correctamente.",
    });
  })
);

module.exports = router;
