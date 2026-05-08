const express = require("express");
const { query } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { requireRole } = require("../middlewares/rbac.middleware");
const { ROLE_NAMES } = require("../utils/policy-engine");
const { wrapRoute } = require("../utils/route");
const { parseInteger } = require("../utils/validators");

const router = express.Router();

router.use(authenticate);
router.use(requireRole(ROLE_NAMES.ADMIN, ROLE_NAMES.AUDITOR));

router.get(
  "/",
  wrapRoute(async (req, res) => {
    const clauses = [];
    const values = [];
    let nextIndex = 1;

    if (req.query.allowed !== undefined) {
      clauses.push(`al.allowed = $${nextIndex++}`);
      values.push(String(req.query.allowed) === "true");
    }

    if (req.query.userId) {
      clauses.push(`al.user_id = $${nextIndex++}`);
      values.push(parseInteger(req.query.userId, "userId"));
    }

    if (req.query.action) {
      clauses.push(`LOWER(al.action) = LOWER($${nextIndex++})`);
      values.push(String(req.query.action).trim());
    }

    const limit = req.query.limit ? parseInteger(req.query.limit, "limit") : 100;
    values.push(limit);

    const where = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";

    const result = await query(
      `
        SELECT
          al.id,
          al.user_id,
          u.email AS user_email,
          u.full_name AS user_full_name,
          al.action,
          al.resource,
          al.resource_id,
          al.allowed,
          al.detail,
          al.created_at
        FROM audit_logs al
        LEFT JOIN users u ON u.id = al.user_id
        ${where}
        ORDER BY al.created_at DESC
        LIMIT $${nextIndex}
      `,
      values
    );

    res.json({
      logs: result.rows,
    });
  })
);

router.get(
  "/summary",
  wrapRoute(async (_req, res) => {
    const [totals, recentDenied, topActions] = await Promise.all([
      query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE allowed = TRUE)::int AS allowed_total,
          COUNT(*) FILTER (WHERE allowed = FALSE)::int AS denied_total
        FROM audit_logs
      `),
      query(`
        SELECT
          COUNT(*)::int AS denied_last_24h
        FROM audit_logs
        WHERE allowed = FALSE
          AND created_at >= NOW() - INTERVAL '24 hours'
      `),
      query(`
        SELECT action, COUNT(*)::int AS total
        FROM audit_logs
        GROUP BY action
        ORDER BY total DESC, action ASC
        LIMIT 8
      `),
    ]);

    res.json({
      totals: totals.rows[0],
      deniedLast24h: recentDenied.rows[0].denied_last_24h,
      topActions: topActions.rows,
    });
  })
);

module.exports = router;
