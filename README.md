# Lab08-Nubes-GestionInventario-Serva

## TechStore Lab en 3 microservicios

Arquitectura final del laboratorio:

- `database/`: PostgreSQL con esquema y datos semilla.
- `security-service/`: API de seguridad con JWT, RBAC, ABAC y MFA.
- `frontend/`: interfaz única con login inicial y panel interno separado por Autenticación, RBAC, ABAC y Auditoría.

## Qué sí quedó funcional

- MFA real por **TOTP** para cualquier celular con app compatible:
  Google Authenticator, Microsoft Authenticator, Authy, 1Password y similares.
- MFA por **email** desde la misma página.
- RBAC para roles y usuarios.
- ABAC para productos por tienda, premium y campos permitidos.
- Reportes de inventario para Administrador, Gerente y Auditor.
- Despliegue completo con **3 servicios Docker**.

## Arranque rápido

```bash
docker compose up --build
```

Después abre:

- Frontend: `http://localhost:8080`
- API seguridad: `http://localhost:3000`
- PostgreSQL: `localhost:5433`

## Usuarios semilla

Todos usan la contraseña:

```text
TechStore2026!
```

Usuarios:

- `admin@techstore.com`
- `gerente@techstore.com`
- `gerente_lima@techstore.com`
- `empleado@techstore.com`
- `auditor@techstore.com`

## Cómo probar el MFA real con celular

1. Entra al frontend en `http://localhost:8080`.
2. Registra un usuario nuevo.
3. Inicia sesión con esa cuenta.
4. En el módulo `Autenticación`, pulsa `Generar QR TOTP`.
5. Escanea el QR con tu app autenticadora en el celular.
6. Ingresa el OTP actual para confirmar la activación.
7. Cierra sesión y vuelve a iniciar.
8. En el siguiente login, el sistema pedirá MFA por `TOTP`.
9. Escribe el código de 6 dígitos que aparece en tu celular.

Ese flujo sí es MFA real basado en estándar TOTP.

## Cómo probar el método por email

Desde la misma página:

1. Inicia sesión con una cuenta.
2. En `Autenticación`, activa `MFA por email`.
3. Cierra sesión y vuelve a entrar.
4. Cuando aparezca el challenge, pulsa `Enviar código por email`.
5. Si `EMAIL_DELIVERY_MODE=preview`, el código se muestra en la interfaz.
6. Si configuras SMTP real, el código llega al correo del usuario.

## SMTP real

Por defecto el laboratorio queda en modo `preview`, para que puedas probar MFA por email sin depender de un proveedor externo.

Si vas a usar **QR / OTP con Google Authenticator**, no necesitas configurar SMTP ni correo real.

Si quieres correo real, no pongas credenciales directamente en `docker-compose.yml`. Usa un archivo `.env` local, porque `.env` está en `.gitignore` y no se sube a GitHub.

1. Copia el ejemplo:

```bash
copy .env.example .env
```

2. Edita `.env` y coloca tus datos SMTP:

```env
EMAIL_DELIVERY_MODE=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu_correo@dominio.com
SMTP_PASS=tu_app_password
SMTP_FROM=tu_correo@dominio.com
```

3. Reinicia Docker:

```bash
docker compose up --build -d
```

Variables usadas por `security-service`:

- `EMAIL_DELIVERY_MODE=smtp`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Ejemplo típico con Gmail o Google Workspace:

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=tu_correo`
- `SMTP_PASS=contraseña de aplicación`
- `SMTP_FROM=tu_correo`

Importante:

- `SMTP_PASS` no suele ser tu contraseña normal, sino una contraseña de aplicación.
- No subas `.env` a GitHub.
- Si compartiste una contraseña por error, revócala y genera otra.
- Si corres el proyecto en otra computadora y quieres email real, esa computadora también necesita su propio `.env`.
- No hay forma de enviar correos reales sin alguna credencial SMTP o API key.

Para volver al modo sin correo real:

```env
EMAIL_DELIVERY_MODE=preview
```

## Endpoints principales

Autenticación:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/mfa/email/send`
- `POST /api/auth/mfa/verify`
- `GET /api/auth/me`
- `PUT /api/auth/mfa/email`
- `POST /api/auth/mfa/totp/setup`
- `POST /api/auth/mfa/totp/confirm`
- `DELETE /api/auth/mfa/totp`

Catálogos:

- `GET /api/meta/bootstrap`
- `GET /api/stores`
- `GET /api/reports/inventory`

RBAC:

- `GET /api/roles`
- `POST /api/roles`
- `PUT /api/roles/:id`
- `DELETE /api/roles/:id`
- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `GET /api/users/:id/roles`
- `POST /api/users/:id/roles`
- `DELETE /api/users/:id/roles/:roleId`

ABAC:

- `GET /api/products`
- `GET /api/products/:id`
- `POST /api/products`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`

## Reglas de autorización implementadas

RBAC:

- Solo `Administrador` crea, edita y elimina roles.
- Solo `Administrador` administra usuarios y asigna roles.
- Todos los autenticados pueden consultar roles.
- `Auditor` puede consultar usuarios y roles en modo solo lectura.

ABAC en productos:

- `Administrador`: acceso total.
- `Gerente`: solo su tienda; no cambia categoría.
- `Empleado`: solo su tienda; solo actualiza `stock`; no elimina; no crea premium.
- `Auditor`: solo lectura global.

Reportes:

- `Administrador`: reportes globales de inventario.
- `Gerente`: reportes de su tienda.
- `Auditor`: reportes globales en modo solo lectura.

## Estructura

```text
database/
  Dockerfile
  init/
    01-schema.sql
    02-seed.sql

security-service/
  Dockerfile
  package.json
  src/

frontend/
  Dockerfile
  nginx.conf
  public/

docker-compose.yml
```

## Nota importante sobre “MFA auténtico con cualquier celular”

El método verdaderamente portable y estándar para “cualquier celular” no es SMS improvisado, sino **TOTP**. Por eso la solución quedó centrada en QR + app autenticadora. Eso evita depender de un proveedor de SMS y funciona con casi cualquier smartphone.

## Google Authenticator en el laboratorio

No necesitas una API de Google para usar **Google Authenticator**.

Google Authenticator no funciona por integración remota tipo OAuth ni por un servicio web de Google. Lo que usa es el estándar **TOTP**. Para eso el backend solo necesita:

- una librería TOTP como `otplib`
- una librería para generar QR como `qrcode`
- guardar `mfa_totp_secret` y `mfa_totp_enabled` en la base de datos

Flujo técnico implementado:

1. El backend genera un `secret`.
2. Con ese `secret` construye un `otpauth://`.
3. Ese `otpauth://` se convierte en QR.
4. El usuario escanea el QR con Google Authenticator.
5. La app empieza a generar códigos de 6 dígitos cada 30 segundos.
6. En cada login futuro, el backend valida el código con `otplib`.

Endpoints usados para eso:

- `POST /api/auth/mfa/totp/setup`
- `POST /api/auth/mfa/totp/confirm`
- `POST /api/auth/mfa/verify`

Si quisieras `Google Sign-In`, eso sí sería otra cosa y requeriría OAuth 2.0 de Google. Para **Google Authenticator**, no hace falta ninguna API externa.

## Conclusiones

- La autenticación en la nube no debe quedarse en usuario y contraseña; MFA reduce el riesgo ante robo de credenciales.
- RBAC simplifica el control por perfil, mientras que ABAC permite reglas más finas basadas en atributos reales del negocio como tienda, premium y campos editables.
- El uso de JWT, hashing de contraseñas, bloqueo por intentos y auditoría centralizada mejora la trazabilidad y la protección de operaciones críticas.
- TOTP con QR es una solución práctica, estándar y portable para MFA real en laboratorio y producción sin depender de proveedores externos.
