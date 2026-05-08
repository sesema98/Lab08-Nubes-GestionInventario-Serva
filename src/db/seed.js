const { getDb } = require("./connection");
const { hashPassword } = require("../utils/password");
const { nowIso } = require("../utils/time");
const { ROLE_NAMES, DEFAULT_SEED_PASSWORD } = require("../config/constants");

function seedDatabase({ reset = false } = {}) {
  const db = getDb();
  const timestamp = nowIso();

  if (reset) {
    db.exec(`
      DELETE FROM audit_logs;
      DELETE FROM mfa_challenges;
      DELETE FROM usuario_roles;
      DELETE FROM productos;
      DELETE FROM usuarios;
      DELETE FROM roles;
      DELETE FROM tiendas;
      DELETE FROM sqlite_sequence;
    `);
  }

  const count = db.prepare("SELECT COUNT(*) AS total FROM roles").get().total;
  if (count > 0) {
    return;
  }

  const insertStore = db.prepare(
    "INSERT INTO tiendas (nombre, fecha_creacion) VALUES (?, ?)"
  );
  ["Lima", "Arequipa", "Cusco"].forEach((storeName) =>
    insertStore.run(storeName, timestamp)
  );

  const insertRole = db.prepare(
    "INSERT INTO roles (nombre, descripcion, fecha_creacion) VALUES (?, ?, ?)"
  );
  insertRole.run(
    ROLE_NAMES.ADMIN,
    "Acceso total al sistema y administración completa.",
    timestamp
  );
  insertRole.run(
    ROLE_NAMES.MANAGER,
    "Gestiona productos de su tienda y revisa reportes de su ubicación.",
    timestamp
  );
  insertRole.run(
    ROLE_NAMES.EMPLOYEE,
    "Consulta productos y actualiza stock dentro de su tienda.",
    timestamp
  );
  insertRole.run(
    ROLE_NAMES.AUDITOR,
    "Acceso de solo lectura para auditoría y generación de reportes.",
    timestamp
  );

  const stores = db
    .prepare("SELECT id, nombre FROM tiendas")
    .all()
    .reduce((acc, row) => ({ ...acc, [row.nombre]: row.id }), {});

  const roles = db
    .prepare("SELECT id, nombre FROM roles")
    .all()
    .reduce((acc, row) => ({ ...acc, [row.nombre]: row.id }), {});

  const passwordHash = hashPassword(DEFAULT_SEED_PASSWORD);
  const insertUser = db.prepare(`
    INSERT INTO usuarios (
      email, password_hash, nombre_completo, tienda_id, mfa_habilitado,
      mfa_secret, activo, failed_login_attempts, locked_until, fecha_creacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const assignRole = db.prepare(`
    INSERT INTO usuario_roles (usuario_id, rol_id, asignado_por, fecha_asignacion)
    VALUES (?, ?, ?, ?)
  `);

  const userIds = {};
  const createUser = (email, fullName, storeName, roleNames) => {
    const result = insertUser.run(
      email,
      passwordHash,
      fullName,
      stores[storeName],
      1,
      null,
      1,
      0,
      null,
      timestamp
    );
    userIds[email] = result.lastInsertRowid;
    roleNames.forEach((roleName) => {
      assignRole.run(result.lastInsertRowid, roles[roleName], 1, timestamp);
    });
  };

  createUser("admin@techstore.com", "Admin TechStore", "Lima", [
    ROLE_NAMES.ADMIN,
  ]);
  createUser("gerente@techstore.com", "Gerente General Lima", "Lima", [
    ROLE_NAMES.MANAGER,
  ]);
  createUser("gerente_lima@techstore.com", "Gerente Lima", "Lima", [
    ROLE_NAMES.MANAGER,
  ]);
  createUser("empleado@techstore.com", "Empleado Lima", "Lima", [
    ROLE_NAMES.EMPLOYEE,
  ]);
  createUser("auditor@techstore.com", "Auditor TechStore", "Cusco", [
    ROLE_NAMES.AUDITOR,
  ]);

  const adminId = userIds["admin@techstore.com"];
  db.prepare("UPDATE usuario_roles SET asignado_por = ?").run(adminId);

  const insertProduct = db.prepare(`
    INSERT INTO productos (
      nombre, descripcion, precio, stock, categoria, tienda_id, es_premium,
      creado_por, fecha_creacion, fecha_actualizacion
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertProduct.run(
    "Laptop HP",
    "Laptop empresarial con 16GB RAM y SSD de 512GB.",
    4200,
    8,
    "Laptops",
    stores.Lima,
    1,
    adminId,
    timestamp,
    timestamp
  );
  insertProduct.run(
    "Mouse Logitech",
    "Mouse inalámbrico para oficina.",
    120,
    25,
    "Accesorios",
    stores.Lima,
    0,
    adminId,
    timestamp,
    timestamp
  );
  insertProduct.run(
    "Monitor Samsung 27",
    "Monitor IPS 27 pulgadas.",
    980,
    12,
    "Monitores",
    stores.Arequipa,
    0,
    adminId,
    timestamp,
    timestamp
  );
}

module.exports = {
  seedDatabase,
};
