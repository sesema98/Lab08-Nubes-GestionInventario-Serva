const { getDb } = require("../db/connection");

function mapStore(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.tienda_id,
    nombre: row.tienda_nombre,
  };
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    nombreCompleto: row.nombre_completo,
    tiendaId: row.tienda_id,
    tienda: mapStore(row),
    mfaHabilitado: Boolean(row.mfa_habilitado),
    activo: Boolean(row.activo),
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    fechaCreacion: row.fecha_creacion,
  };
}

function listRolesForUser(userId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT r.id, r.nombre, r.descripcion
      FROM roles r
      INNER JOIN usuario_roles ur ON ur.rol_id = r.id
      WHERE ur.usuario_id = ?
      ORDER BY r.nombre
    `)
    .all(userId);
}

function getUserBaseById(userId) {
  const db = getDb();
  return db
    .prepare(`
      SELECT
        u.*,
        t.id AS tienda_id,
        t.nombre AS tienda_nombre
      FROM usuarios u
      INNER JOIN tiendas t ON t.id = u.tienda_id
      WHERE u.id = ?
    `)
    .get(userId);
}

function getUserBaseByEmail(email) {
  const db = getDb();
  return db
    .prepare(`
      SELECT
        u.*,
        t.id AS tienda_id,
        t.nombre AS tienda_nombre
      FROM usuarios u
      INNER JOIN tiendas t ON t.id = u.tienda_id
      WHERE LOWER(u.email) = LOWER(?)
    `)
    .get(email);
}

function getUserWithRolesById(userId) {
  const user = mapUser(getUserBaseById(userId));
  if (!user) {
    return null;
  }
  const roleDetails = listRolesForUser(userId);
  return {
    ...user,
    roles: roleDetails.map((role) => role.nombre),
    roleDetails,
  };
}

function getUserWithRolesByEmail(email) {
  const base = getUserBaseByEmail(email);
  if (!base) {
    return null;
  }
  const user = mapUser(base);
  const roleDetails = listRolesForUser(user.id);
  return {
    ...user,
    passwordHash: base.password_hash,
    roles: roleDetails.map((role) => role.nombre),
    roleDetails,
  };
}

function listUsers() {
  const db = getDb();
  const rows = db
    .prepare(`
      SELECT
        u.*,
        t.id AS tienda_id,
        t.nombre AS tienda_nombre
      FROM usuarios u
      INNER JOIN tiendas t ON t.id = u.tienda_id
      ORDER BY u.id
    `)
    .all();

  return rows.map((row) => getUserWithRolesById(row.id));
}

module.exports = {
  getUserWithRolesById,
  getUserWithRolesByEmail,
  listUsers,
  listRolesForUser,
};
