const { getDb } = require("./connection");

function initializeDatabase() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS tiendas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      fecha_creacion TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      nombre_completo TEXT NOT NULL,
      tienda_id INTEGER NOT NULL,
      mfa_habilitado INTEGER NOT NULL DEFAULT 1,
      mfa_secret TEXT,
      activo INTEGER NOT NULL DEFAULT 1,
      failed_login_attempts INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT,
      fecha_creacion TEXT NOT NULL,
      FOREIGN KEY (tienda_id) REFERENCES tiendas(id)
    );

    CREATE TABLE IF NOT EXISTS usuario_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      rol_id INTEGER NOT NULL,
      asignado_por INTEGER,
      fecha_asignacion TEXT NOT NULL,
      UNIQUE(usuario_id, rol_id),
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (rol_id) REFERENCES roles(id),
      FOREIGN KEY (asignado_por) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS mfa_challenges (
      id TEXT PRIMARY KEY,
      usuario_id INTEGER NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      consumed INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER NOT NULL,
      categoria TEXT NOT NULL,
      tienda_id INTEGER NOT NULL,
      es_premium INTEGER NOT NULL DEFAULT 0,
      creado_por INTEGER NOT NULL,
      fecha_creacion TEXT NOT NULL,
      fecha_actualizacion TEXT NOT NULL,
      FOREIGN KEY (tienda_id) REFERENCES tiendas(id),
      FOREIGN KEY (creado_por) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER,
      accion TEXT NOT NULL,
      recurso TEXT NOT NULL,
      recurso_id TEXT,
      permitido INTEGER NOT NULL DEFAULT 1,
      detalle TEXT,
      fecha_creacion TEXT NOT NULL,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );
  `);
}

module.exports = {
  initializeDatabase,
};
