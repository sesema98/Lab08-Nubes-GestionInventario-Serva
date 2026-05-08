require("dotenv").config();

module.exports = {
  port: Number(process.env.PORT || 3000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgresql://techstore:techstore@database:5432/techstore",
  jwtSecret: process.env.JWT_SECRET || "techstore-super-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:8080",
  mfaChallengeTtlMinutes: Number(process.env.MFA_CHALLENGE_TTL_MINUTES || 5),
  mfaMaxAttempts: Number(process.env.MFA_MAX_ATTEMPTS || 3),
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES || 15),
  totpIssuer: process.env.TOTP_ISSUER || "TechStore Lab",
  emailDeliveryMode: process.env.EMAIL_DELIVERY_MODE || "preview",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFrom: process.env.SMTP_FROM || "techstore@example.com",
};
