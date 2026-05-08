const { query } = require("../db/pool");

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    storeId: row.store_id,
    store: {
      id: row.store_id,
      name: row.store_name,
    },
    mfaEmailEnabled: row.mfa_email_enabled,
    mfaTotpEnabled: row.mfa_totp_enabled,
    mfaTotpSecret: row.mfa_totp_secret,
    active: row.active,
    failedLoginAttempts: row.failed_login_attempts,
    lockedUntil: row.locked_until,
    createdAt: row.created_at,
  };
}

async function listRolesForUser(userId) {
  const result = await query(
    `
      SELECT r.id, r.name, r.description
      FROM roles r
      INNER JOIN user_roles ur ON ur.role_id = r.id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `,
    [userId]
  );

  return result.rows;
}

async function getUserBaseById(userId) {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.store_id,
        s.name AS store_name,
        u.mfa_email_enabled,
        u.mfa_totp_enabled,
        u.mfa_totp_secret,
        u.active,
        u.failed_login_attempts,
        u.locked_until,
        u.created_at
      FROM users u
      INNER JOIN stores s ON s.id = u.store_id
      WHERE u.id = $1
    `,
    [userId]
  );

  return result.rows[0] || null;
}

async function getUserBaseByEmail(email) {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.store_id,
        s.name AS store_name,
        u.mfa_email_enabled,
        u.mfa_totp_enabled,
        u.mfa_totp_secret,
        u.active,
        u.failed_login_attempts,
        u.locked_until,
        u.created_at
      FROM users u
      INNER JOIN stores s ON s.id = u.store_id
      WHERE LOWER(u.email) = LOWER($1)
    `,
    [email]
  );

  return result.rows[0] || null;
}

async function getUserWithRolesById(userId) {
  const base = await getUserBaseById(userId);
  if (!base) {
    return null;
  }

  const user = mapUser(base);
  const roleDetails = await listRolesForUser(user.id);

  return {
    ...user,
    roles: roleDetails.map((role) => role.name),
    roleDetails,
  };
}

async function getUserWithRolesByEmail(email) {
  const base = await getUserBaseByEmail(email);
  if (!base) {
    return null;
  }

  const user = mapUser(base);
  const roleDetails = await listRolesForUser(user.id);

  return {
    ...user,
    passwordHash: base.password_hash,
    roles: roleDetails.map((role) => role.name),
    roleDetails,
  };
}

async function listUsers() {
  const result = await query(
    `
      SELECT
        u.id,
        u.email,
        u.password_hash,
        u.full_name,
        u.store_id,
        s.name AS store_name,
        u.mfa_email_enabled,
        u.mfa_totp_enabled,
        u.mfa_totp_secret,
        u.active,
        u.failed_login_attempts,
        u.locked_until,
        u.created_at
      FROM users u
      INNER JOIN stores s ON s.id = u.store_id
      ORDER BY u.id
    `
  );

  const users = [];
  for (const row of result.rows) {
    users.push(await getUserWithRolesById(row.id));
  }

  return users;
}

module.exports = {
  getUserWithRolesById,
  getUserWithRolesByEmail,
  listUsers,
  listRolesForUser,
};
