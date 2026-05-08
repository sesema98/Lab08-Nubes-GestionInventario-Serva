const express = require("express");
const { query } = require("../db/pool");
const { resolveDeliveryMode } = require("../services/email.service");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

router.get(
  "/bootstrap",
  wrapRoute(async (_req, res) => {
    const [stores, counts, roleBreakdown] = await Promise.all([
      query("SELECT id, name, created_at FROM stores ORDER BY id"),
      query(`
        SELECT
          (SELECT COUNT(*)::int FROM stores) AS stores,
          (SELECT COUNT(*)::int FROM roles) AS roles,
          (SELECT COUNT(*)::int FROM users) AS users,
          (SELECT COUNT(*)::int FROM users WHERE active = TRUE) AS active_users,
          (SELECT COUNT(*)::int FROM products) AS products,
          (SELECT COUNT(*)::int FROM audit_logs) AS audit_logs
      `),
      query(`
        SELECT r.name, COUNT(ur.user_id)::int AS total
        FROM roles r
        LEFT JOIN user_roles ur ON ur.role_id = r.id
        GROUP BY r.id, r.name
        ORDER BY r.name
      `),
    ]);

    res.json({
      stores: stores.rows,
      counts: counts.rows[0],
      roleBreakdown: roleBreakdown.rows,
      emailDeliveryMode: resolveDeliveryMode(),
      demoUsers: [
        {
          email: "admin@techstore.com",
          role: "Administrador",
          store: "Lima",
        },
        {
          email: "gerente_lima@techstore.com",
          role: "Gerente",
          store: "Lima",
        },
        {
          email: "empleado@techstore.com",
          role: "Empleado",
          store: "Lima",
        },
        {
          email: "auditor@techstore.com",
          role: "Auditor",
          store: "Cusco",
        },
        {
          email: "gerente@techstore.com",
          role: "Gerente",
          store: "Lima",
        }
      ],
      demoPassword: "TechStore2026!",
      notes: {
        totp:
          "TOTP es el método real para cualquier celular con Google Authenticator, Microsoft Authenticator, Authy, 1Password u otra app compatible.",
        email:
          resolveDeliveryMode() === "smtp"
            ? "El código por email sale por SMTP real."
            : "El código por email está en modo preview para laboratorio. Configura SMTP para envío real.",
      },
      scenarios: [
        {
          id: "login-mfa",
          title: "Login con MFA",
          expected: "Credenciales correctas, challenge MFA, validación y JWT final.",
        },
        {
          id: "rbac-role-deny",
          title: "RBAC empleado crea rol",
          expected: "Debe devolver acceso denegado porque no es Administrador.",
        },
        {
          id: "abac-manager-update",
          title: "ABAC gerente actualiza premium de su tienda",
          expected: "Debe permitir actualizar precio de Laptop HP en Lima.",
        },
        {
          id: "abac-employee-delete",
          title: "ABAC empleado elimina producto",
          expected: "Debe denegar la eliminación.",
        },
      ],
      policies: {
        authentication: [
          "Registro con email único, nombre completo y tienda asignada.",
          "Contraseña segura: mínimo 8 caracteres, mayúscula, número y carácter especial.",
          "JWT para la sesión.",
          "Bloqueo del usuario después de 5 intentos fallidos por 15 minutos.",
          "MFA configurable dentro de la cuenta despues del login normal.",
          "Al confirmar el QR se activan juntos TOTP y respaldo por email.",
          "Máximo 3 intentos para validar el MFA.",
        ],
        roles: {
          Administrador: {
            roles: {
              create: true,
              read: true,
              update: true,
              delete: true,
            },
            users: {
              create: true,
              read: true,
              update: true,
              delete: true,
              assignRoles: true,
            },
          },
          Gerente: {
            roles: {
              create: false,
              read: true,
              update: false,
              delete: false,
            },
            users: {
              create: false,
              read: false,
              update: false,
              delete: false,
              assignRoles: false,
            },
          },
          Empleado: {
            roles: {
              create: false,
              read: true,
              update: false,
              delete: false,
            },
            users: {
              create: false,
              read: false,
              update: false,
              delete: false,
              assignRoles: false,
            },
          },
          Auditor: {
            roles: {
              create: false,
              read: true,
              update: false,
              delete: false,
            },
            users: {
              create: false,
              read: true,
              update: false,
              delete: false,
              assignRoles: false,
            },
          },
        },
        products: {
          Administrador: {
            select: "Todos los productos.",
            insert: "Puede crear en cualquier tienda.",
            update: "Todos los campos en todas las tiendas.",
            delete: "Puede eliminar cualquier producto.",
          },
          Gerente: {
            select: "Solo productos de su tienda.",
            insert: "Solo puede crear en su tienda.",
            update: "Todos los campos en su tienda excepto categoría.",
            delete: "Solo productos NO premium de su tienda.",
          },
          Empleado: {
            select: "Solo productos de su tienda.",
            insert: "Solo NO premium en su tienda.",
            update: "Solo el campo stock en productos de su tienda.",
            delete: "No puede eliminar productos.",
          },
          Auditor: {
            select: "Todos los productos en solo lectura.",
            insert: "Sin acceso.",
            update: "Sin acceso.",
            delete: "Sin acceso.",
          },
        },
        reports: [
          "Administrador: reportes globales de inventario y auditoría.",
          "Gerente: reportes de inventario de su propia tienda.",
          "Auditor: reportes globales en modo solo lectura.",
        ],
      },
    });
  })
);

module.exports = router;
