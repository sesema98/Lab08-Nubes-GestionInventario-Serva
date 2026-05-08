const express = require("express");
const { getDb } = require("../db/connection");
const { authenticate } = require("../middlewares/auth.middleware");
const {
  authorizeProductCreate,
  authorizeProductDelete,
  authorizeProductUpdate,
  canViewProduct,
} = require("../utils/policy-engine");
const { logAudit } = require("../services/audit.service");
const { HttpError } = require("../utils/http-error");
const { nowIso } = require("../utils/time");
const { requireFields, parseBoolean, parseInteger, parseNumber } = require("../utils/validators");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

function mapProduct(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    precio: row.precio,
    stock: row.stock,
    categoria: row.categoria,
    tiendaId: row.tienda_id,
    tienda: {
      id: row.tienda_id,
      nombre: row.tienda_nombre,
    },
    esPremium: Boolean(row.es_premium),
    creadoPor: row.creado_por,
    fechaCreacion: row.fecha_creacion,
    fechaActualizacion: row.fecha_actualizacion,
  };
}

function getProductById(productId) {
  const db = getDb();
  const row = db
    .prepare(`
      SELECT
        p.*,
        t.nombre AS tienda_nombre
      FROM productos p
      INNER JOIN tiendas t ON t.id = p.tienda_id
      WHERE p.id = ?
    `)
    .get(productId);

  return mapProduct(row);
}

function listAllProducts() {
  const db = getDb();
  return db
    .prepare(`
      SELECT
        p.*,
        t.nombre AS tienda_nombre
      FROM productos p
      INNER JOIN tiendas t ON t.id = p.tienda_id
      ORDER BY p.id
    `)
    .all()
    .map(mapProduct);
}

function normalizeProductPayload(payload, { requireAll = false } = {}) {
  const normalized = {};

  if (requireAll) {
    requireFields(payload, [
      "nombre",
      "descripcion",
      "precio",
      "stock",
      "categoria",
      "tiendaId",
      "esPremium",
    ]);
  }

  if (payload.nombre !== undefined) {
    normalized.nombre = String(payload.nombre).trim();
  }
  if (payload.descripcion !== undefined) {
    normalized.descripcion = String(payload.descripcion).trim();
  }
  if (payload.precio !== undefined) {
    normalized.precio = parseNumber(payload.precio, "precio");
  }
  if (payload.stock !== undefined) {
    normalized.stock = parseInteger(payload.stock, "stock");
  }
  if (payload.categoria !== undefined) {
    normalized.categoria = String(payload.categoria).trim();
  }
  if (payload.tiendaId !== undefined) {
    normalized.tiendaId = parseInteger(payload.tiendaId, "tiendaId");
  }
  if (payload.esPremium !== undefined) {
    normalized.esPremium = parseBoolean(payload.esPremium);
  }

  return normalized;
}

router.use(authenticate);

router.get(
  "/",
  wrapRoute(async (req, res) => {
    let products = listAllProducts().filter((product) => canViewProduct(req.user, product));

    if (req.query.tiendaId) {
      products = products.filter(
        (product) => product.tiendaId === parseInteger(req.query.tiendaId, "tiendaId")
      );
    }
    if (req.query.categoria) {
      products = products.filter(
        (product) =>
          product.categoria.toLowerCase() === String(req.query.categoria).toLowerCase()
      );
    }
    if (req.query.premium !== undefined) {
      const premium = parseBoolean(req.query.premium);
      products = products.filter((product) => product.esPremium === premium);
    }

    res.json({ products });
  })
);

router.get(
  "/:id",
  wrapRoute(async (req, res) => {
    const product = getProductById(parseInteger(req.params.id, "id"));
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
    const db = getDb();
    const payload = normalizeProductPayload(req.body, { requireAll: true });
    const store = db.prepare("SELECT id FROM tiendas WHERE id = ?").get(payload.tiendaId);
    if (!store) {
      throw new HttpError(404, "La tienda indicada no existe.");
    }

    const decision = authorizeProductCreate(req.user, payload);
    if (!decision.allowed) {
      logAudit({
        userId: req.user.id,
        action: "CREATE_PRODUCT",
        resource: "productos",
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    const timestamp = nowIso();
    const result = db.prepare(`
      INSERT INTO productos (
        nombre, descripcion, precio, stock, categoria, tienda_id, es_premium,
        creado_por, fecha_creacion, fecha_actualizacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      payload.nombre,
      payload.descripcion,
      payload.precio,
      payload.stock,
      payload.categoria,
      payload.tiendaId,
      payload.esPremium ? 1 : 0,
      req.user.id,
      timestamp,
      timestamp
    );

    const product = getProductById(result.lastInsertRowid);
    logAudit({
      userId: req.user.id,
      action: "CREATE_PRODUCT",
      resource: "productos",
      resourceId: String(product.id),
      allowed: true,
      detail: `Producto ${product.nombre} creado.`,
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
    const db = getDb();
    const product = getProductById(parseInteger(req.params.id, "id"));
    if (!product) {
      throw new HttpError(404, "Producto no encontrado.");
    }

    const payload = normalizeProductPayload(req.body);
    const decision = authorizeProductUpdate(req.user, product, payload);
    if (!decision.allowed) {
      logAudit({
        userId: req.user.id,
        action: "UPDATE_PRODUCT",
        resource: "productos",
        resourceId: String(product.id),
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    if (decision.sanitizedPayload.tiendaId !== undefined) {
      const store = db
        .prepare("SELECT id FROM tiendas WHERE id = ?")
        .get(decision.sanitizedPayload.tiendaId);
      if (!store) {
        throw new HttpError(404, "La tienda indicada no existe.");
      }
    }

    const assignments = [];
    const values = [];
    const columnMap = {
      nombre: "nombre",
      descripcion: "descripcion",
      precio: "precio",
      stock: "stock",
      categoria: "categoria",
      tiendaId: "tienda_id",
      esPremium: "es_premium",
    };

    Object.entries(decision.sanitizedPayload).forEach(([key, value]) => {
      assignments.push(`${columnMap[key]} = ?`);
      values.push(key === "esPremium" ? (value ? 1 : 0) : value);
    });

    assignments.push("fecha_actualizacion = ?");
    values.push(nowIso());
    values.push(product.id);

    db.prepare(`
      UPDATE productos
      SET ${assignments.join(", ")}
      WHERE id = ?
    `).run(...values);

    const updatedProduct = getProductById(product.id);
    logAudit({
      userId: req.user.id,
      action: "UPDATE_PRODUCT",
      resource: "productos",
      resourceId: String(updatedProduct.id),
      allowed: true,
      detail: `Producto ${updatedProduct.nombre} actualizado.`,
    });

    res.json({
      message: "Producto actualizado correctamente.",
      product: updatedProduct,
    });
  })
);

router.delete(
  "/:id",
  wrapRoute(async (req, res) => {
    const db = getDb();
    const product = getProductById(parseInteger(req.params.id, "id"));
    if (!product) {
      throw new HttpError(404, "Producto no encontrado.");
    }

    const decision = authorizeProductDelete(req.user, product);
    if (!decision.allowed) {
      logAudit({
        userId: req.user.id,
        action: "DELETE_PRODUCT",
        resource: "productos",
        resourceId: String(product.id),
        allowed: false,
        detail: decision.reason,
      });
      throw new HttpError(403, decision.reason);
    }

    db.prepare("DELETE FROM productos WHERE id = ?").run(product.id);
    logAudit({
      userId: req.user.id,
      action: "DELETE_PRODUCT",
      resource: "productos",
      resourceId: String(product.id),
      allowed: true,
      detail: `Producto ${product.nombre} eliminado.`,
    });

    res.json({
      message: "Producto eliminado correctamente.",
    });
  })
);

module.exports = router;
