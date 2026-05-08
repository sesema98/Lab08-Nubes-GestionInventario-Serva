const express = require("express");
const { query } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { logAudit } = require("../services/audit.service");
const { HttpError } = require("../utils/http-error");
const { ROLE_NAMES } = require("../utils/policy-engine");
const { wrapRoute } = require("../utils/route");
const { parseInteger } = require("../utils/validators");

const router = express.Router();

function canViewInventoryReports(user) {
  return (
    user.roles.includes(ROLE_NAMES.ADMIN) ||
    user.roles.includes(ROLE_NAMES.MANAGER) ||
    user.roles.includes(ROLE_NAMES.AUDITOR)
  );
}

async function listStoreSummary(storeId) {
  const values = [];
  const where = storeId ? "WHERE s.id = $1" : "";
  if (storeId) {
    values.push(storeId);
  }

  const result = await query(
    `
      SELECT
        s.id,
        s.name,
        COUNT(p.id)::int AS products,
        COUNT(*) FILTER (WHERE p.is_premium = TRUE)::int AS premium_products,
        COALESCE(SUM(p.stock), 0)::int AS total_stock,
        COALESCE(SUM(p.price * p.stock), 0)::numeric(12, 2) AS inventory_value
      FROM stores s
      LEFT JOIN products p ON p.store_id = s.id
      ${where}
      GROUP BY s.id, s.name
      ORDER BY s.id
    `,
    values
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    products: row.products,
    premiumProducts: row.premium_products,
    totalStock: row.total_stock,
    inventoryValue: Number(row.inventory_value),
  }));
}

async function listCategorySummary(storeId) {
  const values = [];
  const where = storeId ? "WHERE p.store_id = $1" : "";
  if (storeId) {
    values.push(storeId);
  }

  const result = await query(
    `
      SELECT
        p.category,
        COUNT(*)::int AS products,
        COALESCE(SUM(p.stock), 0)::int AS total_stock,
        COALESCE(SUM(p.price * p.stock), 0)::numeric(12, 2) AS inventory_value
      FROM products p
      ${where}
      GROUP BY p.category
      ORDER BY p.category
    `,
    values
  );

  return result.rows.map((row) => ({
    category: row.category,
    products: row.products,
    totalStock: row.total_stock,
    inventoryValue: Number(row.inventory_value),
  }));
}

async function listLowStockProducts(storeId) {
  const values = [];
  const where = storeId
    ? "WHERE p.store_id = $1 AND p.stock <= 5"
    : "WHERE p.stock <= 5";
  if (storeId) {
    values.push(storeId);
  }

  const result = await query(
    `
      SELECT
        p.id,
        p.name,
        p.stock,
        s.name AS store_name
      FROM products p
      INNER JOIN stores s ON s.id = p.store_id
      ${where}
      ORDER BY p.stock ASC, p.name ASC
      LIMIT 8
    `,
    values
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    stock: row.stock,
    storeName: row.store_name,
  }));
}

router.use(authenticate);

router.get(
  "/inventory",
  wrapRoute(async (req, res) => {
    if (!canViewInventoryReports(req.user)) {
      throw new HttpError(403, "No tienes permisos para consultar reportes de inventario.");
    }

    const requestedStoreId = req.query.storeId
      ? parseInteger(req.query.storeId, "storeId")
      : null;
    const scopedStoreId = req.user.roles.includes(ROLE_NAMES.MANAGER)
      ? req.user.storeId
      : requestedStoreId;

    const [storeSummary, categorySummary, lowStockProducts] = await Promise.all([
      listStoreSummary(scopedStoreId),
      listCategorySummary(scopedStoreId),
      listLowStockProducts(scopedStoreId),
    ]);

    await logAudit({
      userId: req.user.id,
      action: "VIEW_INVENTORY_REPORT",
      resource: "reports",
      allowed: true,
      detail: scopedStoreId
        ? `Reporte de inventario consultado para tienda ${scopedStoreId}.`
        : "Reporte de inventario global consultado.",
    });

    res.json({
      scope: scopedStoreId ? "store" : "global",
      storeId: scopedStoreId,
      generatedAt: new Date().toISOString(),
      storeSummary,
      categorySummary,
      lowStockProducts,
    });
  })
);

module.exports = router;
