const express = require("express");
const { query } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { logAudit } = require("../services/audit.service");
const { HttpError } = require("../utils/http-error");
const { wrapRoute } = require("../utils/route");
const { requireFields } = require("../utils/validators");
const { ROLE_NAMES } = require("../utils/policy-engine");

const router = express.Router();

router.use(authenticate);

router.get(
  "/",
  wrapRoute(async (_req, res) => {
    const result = await query("SELECT id, name, description, created_at FROM roles ORDER BY id");
    res.json({ roles: result.rows });
  })
);

router.post(
  "/",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["name", "description"]);

    const existing = await query("SELECT id FROM roles WHERE LOWER(name) = LOWER($1)", [
      String(req.body.name).trim(),
    ]);
    if (existing.rowCount > 0) {
      throw new HttpError(409, "Ya existe un rol con ese nombre.");
    }

    const created = await query(
      `
        INSERT INTO roles (name, description)
        VALUES ($1, $2)
        RETURNING id, name, description, created_at
      `,
      [String(req.body.name).trim(), String(req.body.description).trim()]
    );

    await logAudit({
      userId: req.user.id,
      action: "CREATE_ROLE",
      resource: "roles",
      resourceId: String(created.rows[0].id),
      allowed: true,
      detail: `Rol ${created.rows[0].name} creado.`,
    });

    res.status(201).json({
      message: "Rol creado correctamente.",
      role: created.rows[0],
    });
  })
);

router.put(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    requireFields(req.body, ["name", "description"]);
    const id = Number(req.params.id);

    const existing = await query("SELECT id FROM roles WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    const updated = await query(
      `
        UPDATE roles
        SET name = $2, description = $3
        WHERE id = $1
        RETURNING id, name, description, created_at
      `,
      [id, String(req.body.name).trim(), String(req.body.description).trim()]
    );

    await logAudit({
      userId: req.user.id,
      action: "UPDATE_ROLE",
      resource: "roles",
      resourceId: String(id),
      allowed: true,
      detail: `Rol ${updated.rows[0].name} actualizado.`,
    });

    res.json({
      message: "Rol actualizado correctamente.",
      role: updated.rows[0],
    });
  })
);

router.delete(
  "/:id",
  requireRole(ROLE_NAMES.ADMIN),
  wrapRoute(async (req, res) => {
    const id = Number(req.params.id);
    const existing = await query("SELECT id, name FROM roles WHERE id = $1", [id]);
    if (existing.rowCount === 0) {
      throw new HttpError(404, "Rol no encontrado.");
    }

    const assignedUsers = await query(
      "SELECT COUNT(*)::int AS total FROM user_roles WHERE role_id = $1",
      [id]
    );
    if (assignedUsers.rows[0].total > 0) {
      throw new HttpError(409, "No se puede eliminar un rol con usuarios asignados.");
    }

    await query("DELETE FROM roles WHERE id = $1", [id]);
    await logAudit({
      userId: req.user.id,
      action: "DELETE_ROLE",
      resource: "roles",
      resourceId: String(id),
      allowed: true,
      detail: `Rol ${existing.rows[0].name} eliminado.`,
    });

    res.json({
      message: "Rol eliminado correctamente.",
    });
  })
);

module.exports = router;
