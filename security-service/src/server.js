const { app } = require("./app");
const env = require("./config/env");
const { query } = require("./db/pool");

async function waitForDatabase() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      await query("SELECT 1");
      return;
    } catch (error) {
      console.error(`Esperando PostgreSQL (intento ${attempt}/30)...`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  throw new Error("No se pudo conectar a PostgreSQL.");
}

async function start() {
  await waitForDatabase();
  app.listen(env.port, () => {
    console.log(`Security service escuchando en http://0.0.0.0:${env.port}`);
  });
}

start().catch((error) => {
  console.error("Fallo al iniciar el servicio de seguridad:", error);
  process.exit(1);
});
