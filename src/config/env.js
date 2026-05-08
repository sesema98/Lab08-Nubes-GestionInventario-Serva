const path = require("path");
require("dotenv").config();

const rootDir = process.cwd();
const dbFile = process.env.DB_FILE || "./data/techstore.db";

module.exports = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "techstore-dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  dbFile: dbFile === ":memory:" ? ":memory:" : path.resolve(rootDir, dbFile),
  mfaCodeTtlMinutes: Number(process.env.MFA_CODE_TTL_MINUTES || 5),
  mfaMaxAttempts: Number(process.env.MFA_MAX_ATTEMPTS || 3),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  exposeMfaCode:
    String(process.env.EXPOSE_MFA_CODE ?? "true").toLowerCase() === "true",
  mailboxDir: path.resolve(rootDir, process.env.MAILBOX_DIR || "./tmp/mailbox"),
};
