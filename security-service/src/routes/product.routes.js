const express = require("express");
const { query } = require("../db/pool");
const { authenticate } = require("../middlewares/auth.middleware");
const { logAudit } = require("../services/audit.service");
const { HttpError } = require("../utils/http-error");
const {
  authorizeProductCreate,
  authorizeProductDelete,
  authorizeProductUpdate,
  canViewProduct,
} = require("../utils/policy-engine");
const { wrapRoute } = require("../utils/route");
const { parseBoolean, parseInteger, parseNumber, requireFields } = require("../utils/validators");

const router = express.Router();

function mapProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    stock: row.stock,
    category: row.category,
    storeId: row.store_id,
    store: {
      id: row.store_id,
      name: row.store_name,
    },
    isPremium: row.is_premium,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getProductById(productId) {
  const result = await query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.category,
        p.store_id,
        s.name AS store_name,
        p.is_premium,
        p.created_by,
        p.created_at,
        p.updated_at
      FROM products p
      INNER JOIN stores s ON s.id = p.store_id
      WHERE p.id = $1
    `,
    [productId]
  );

  return mapProduct(result.rows[0]);
}

async function listAllProducts() {
  const result = await query(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.price,
        p.stock,
        p.category,
        p.store_id,
        s.name AS store_name,
        p.is_premium,
        p.created_by,
        p.created_at,
        p.updated_at
      FROM products p
      INNER JOIN stores s ON s.id = p.store_id
      ORDER BY p.id
    `
  );

  return result.rows.map(mapProduct);
}

function normalizeProductPayload(payload, { requireAll = false } = {}) {
  const normalized = {};

  if (requireAll) {
    requireFields(payload, [
      "name",
      "description",
      "price",
      "stock",
      "category",
      "storeId",
      "isPremium",
    ]);
  }

  if (payload.name !== undefined) {
    normalized.name = String(payload.name).trim();
  }
  if (payload.description !== undefined) {
    normalized.description = String(payload.description).trim();
  }
  if (payload.price !== undefined) {
    normalized.price = parseNumber(payload.price, "price");
  }
  if (payload.stock !== undefined) {
    normalized.stock = parseInteger(payload.stock, "stock");
  }
  if (payload.category !== undefined) {
    normalized.category = String(payload.category).trim();
  }
  if (payload.storeId !== undefined) {
    normalized.storeId = parseInteger(payload.storeId, "storeId");
  }
  if (payload.isPremium !== undefined) {
    normalized.isPremium = parseBoolean(payload.isPremium);
  }

  return normalized;
}

router.use(authenticate);

router.get(
  "/",
  wrapRoute(async (req, res) => {
    let products = (await listAllProducts()).filter((product) => canViewProduct(req.user, product));

    if (req.query.storeId) {
      const storeId = parseInteger(req.query.storeId, "storeId");
      products = products.filter((product) => product.storeId === storeId);
    }
    if (req.query.category) {
      const category = String(req.query.category).toLowerCase();
      products = products.filter((product) => product.category.toLowerCase() === category);
    }
    if (req.query.premium !== undefined) {
      const premium = parseBoolean(req.query.premium);
      products = products.filter((product) => product.isPremium === premium);
    }

    res.json({ products });
  })
);

router.get(
  "/:id",
  wrapRoute(async (req, res) => {
    const product = await getProductById(parseInteger(req.params.id, "id"));
    if (!product) {
      throw new HttpError(404, "Producto no encontrado.");
    }
    if (!canViewProduct(req.user, product)) {
      throw new HttpError(403, "No tienes permisos para ver este producto.");
    }
    res.json({ product });
  })
);

router.post(
  "/",
  wrapRoute(async (req, res) => {
    const payload = normalizeProductPayload(req.body, { requireAll: true });
    const store = await query("SELECT id FROM stores WHERE id = $1", [payload.storeId]);
    if (store.rowCount === 0) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const decision = authorizeProductCreate(req.user, payload);
    if (!decision.allowed) {
      await logAudit({
        userId: req.user.id,
        action: "CREATE_PRODUCT",
        resource: "products",
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    const created = await query(
      `
        INSERT INTO products (
          name,
          description,
          price,
          stock,
          category,
          store_id,
          is_premium,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        payload.name,
        payload.description,
        payload.price,
        payload.stock,
        payload.category,
        payload.storeId,
        payload.isPremium,
        req.user.id,
      ]
    );

    const product = await getProductById(created.rows[0].id);
    await logAudit({
      userId: req.user.id,
      action: "CREATE_PRODUCT",
      resource: "products",
      resourceId: String(product.id),
      allowed: true,
      detail: `Producto ${product.name} creado.`,
    });

    res.status(201).json({
      message: "Producto creado correctamente.",
      product,
    });
  })
);

router.patch(
  "/:id",
  wrapRoute(async (req, res) => {
    const product = await getProductById(parseInteger(req.params.id, "id"));
    if (!product) {
      throw new HttpError(404, "Producto no encontrado.");
    }

    const payload = normalizeProductPayload(req.body);
    const decision = authorizeProductUpdate(req.user, product, payload);
    if (!decision.allowed) {
      await logAudit({
        userId: req.user.id,
        action: "UPDATE_PRODUCT",
        resource: "products",
        resourceId: String(product.id),
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    if (decision.sanitizedPayload.storeId !== undefined) {
      const store = await query("SELECT id FROM stores WHERE id = $1", [
        decision.sanitizedPayload.storeId,
      ]);
      if (store.rowCount === 0) {
        throw new HttpError(404, "La tienda indicada no existe.");
      }
    }

    const assignments = [];
    const values = [];
    let nextIndex = 2;
    const columnMap = {
      name: "name",
      description: "description",
      price: "price",
      stock: "stock",
      category: "category",
      storeId: "store_id",
      isPremium: "is_premium",
    };

    Object.entries(decision.sanitizedPayload).forEach(([key, value]) => {
      assignments.push(`${columnMap[key]} = $${nextIndex++}`);
      values.push(value);
    });

    assignments.push(`updated_at = NOW()`);
    await query(
      `
        UPDATE products
        SET ${assignments.join(", ")}
        WHERE id = $1
      `,
      [product.id, ...values]
    );

    const updated = await getProductById(product.id);
    await logAudit({
      userId: req.user.id,
      action: "UPDATE_PRODUCT",
      resource: "products",
      resourceId: String(updated.id),
      allowed: true,
      detail: `Producto ${updated.name} actualizado.`,
    });

    res.json({
      message: "Producto actualizado correctamente.",
      product: updated,
    });
  })
);

router.delete(
  "/:id",
  wrapRoute(async (req, res) => {
    const product = await getProductById(parseInteger(req.params.id, "id"));
    if (!product) {
      throw new HttpError(404, "Producto no encontrado.");
    }

    const decision = authorizeProductDelete(req.user, product);
    if (!decision.allowed) {
      await logAudit({
        userId: req.user.id,
        action: "DELETE_PRODUCT",
        resource: "products",
        resourceId: String(product.id),
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    await query("DELETE FROM products WHERE id = $1", [product.id]);
    await logAudit({
      userId: req.user.id,
      action: "DELETE_PRODUCT",
      resource: "products",
      resourceId: String(product.id),
      allowed: true,
      detail: `Producto ${product.name} eliminado.`,
    });

    res.json({
      message: "Producto eliminado correctamente.",
    });
  })
);

module.exports = router;
