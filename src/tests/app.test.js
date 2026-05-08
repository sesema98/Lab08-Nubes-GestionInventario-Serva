const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");

process.env.NODE_ENV = "test";
process.env.DB_FILE = ":memory:";
process.env.EXPOSE_MFA_CODE = "true";
process.env.MAILBOX_DIR = "./tmp/mailbox-test";

const request = require("supertest");
const { app } = require("../app");
const env = require("../config/env");
const { initializeDatabase } = require("../db/schema");
const { seedDatabase } = require("../db/seed");

function resetState() {
  initializeDatabase();
  seedDatabase({ reset: true });
  fs.rmSync(env.mailboxDir, { recursive: true, force: true });
  fs.mkdirSync(env.mailboxDir, { recursive: true });
}

async function loginWithMfa(email, password) {
  const loginResponse = await request(app).post("/api/auth/login").send({
    email,
    password,
  });

  assert.equal(loginResponse.status, 202);
  assert.ok(loginResponse.body.challengeId);
  assert.ok(loginResponse.body.debugCode);

  const verifyResponse = await request(app).post("/api/auth/verify-mfa").send({
    challengeId: loginResponse.body.challengeId,
    code: loginResponse.body.debugCode,
  });

  assert.equal(verifyResponse.status, 200);
  assert.ok(verifyResponse.body.token);

  return verifyResponse.body.token;
}

test.beforeEach(() => {
  resetState();
});

test("rechaza una contraseña débil en el registro", async () => {
  const response = await request(app).post("/api/auth/register").send({
    email: "nuevo@techstore.com",
    password: "12345678",
    nombreCompleto: "Usuario Débil",
    tiendaId: 1,
  });

  assert.equal(response.status, 400);
  assert.match(response.body.error, /contraseña/i);
});

test("permite login con MFA para gerente", async () => {
  const loginResponse = await request(app).post("/api/auth/login").send({
    email: "gerente@techstore.com",
    password: "TechStore2026!",
  });

  assert.equal(loginResponse.status, 202);
  assert.ok(loginResponse.body.debugCode);

  const verifyResponse = await request(app).post("/api/auth/verify-mfa").send({
    challengeId: loginResponse.body.challengeId,
    code: loginResponse.body.debugCode,
  });

  assert.equal(verifyResponse.status, 200);
  assert.ok(verifyResponse.body.token);
  assert.equal(verifyResponse.body.user.email, "gerente@techstore.com");
});

test("impide que un empleado cree roles", async () => {
  const token = await loginWithMfa("empleado@techstore.com", "TechStore2026!");

  const response = await request(app)
    .post("/api/roles")
    .set("Authorization", `Bearer ${token}`)
    .send({
      nombre: "Supervisor",
      descripcion: "Rol temporal",
    });

  assert.equal(response.status, 403);
});

test("permite que el gerente de Lima actualice el precio de un producto premium de su tienda", async () => {
  const token = await loginWithMfa("gerente_lima@techstore.com", "TechStore2026!");

  const response = await request(app)
    .patch("/api/products/1")
    .set("Authorization", `Bearer ${token}`)
    .send({
      precio: 3999,
    });

  assert.equal(response.status, 200);
  assert.equal(response.body.product.precio, 3999);
});

test("impide que un empleado elimine productos", async () => {
  const token = await loginWithMfa("empleado@techstore.com", "TechStore2026!");

  const response = await request(app)
    .delete("/api/products/2")
    .set("Authorization", `Bearer ${token}`);

  assert.equal(response.status, 403);
  assert.match(response.body.error, /empleados/i);
});
