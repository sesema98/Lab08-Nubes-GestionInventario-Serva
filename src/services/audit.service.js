const { getDb } = require("../db/connection");
const { nowIso } = require("../utils/time");

function logAudit({ userId = null, action, resource, resourceId = null, allowed, detail }) {
  const db = getDb();
  db.prepare(`
    INSERT INTO audit_logs (
      usuario_id, accion, recurso, recurso_id, permitido, detalle, fecha_creacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(userId, action, resource, resourceId, allowed ? 1 : 0, detail || null, nowIso());
}

module.exports = {
  logAudit,
};
