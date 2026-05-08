const { query } = require("../db/pool");

async function logAudit({
  userId = null,
  action,
  resource,
  resourceId = null,
  allowed,
  detail,
}) {
  await query(
    `
      INSERT INTO audit_logs (
        user_id, action, resource, resource_id, allowed, detail
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [userId, action, resource, resourceId, allowed, detail || null]
  );
}

module.exports = {
  logAudit,
};
