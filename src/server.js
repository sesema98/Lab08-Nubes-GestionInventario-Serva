const env = require("./config/env");
const { app } = require("./app");
const { initializeDatabase } = require("./db/schema");
const { seedDatabase } = require("./db/seed");
const { DEFAULT_SEED_PASSWORD } = require("./config/constants");

initializeDatabase();
seedDatabase();

app.listen(env.port, () => {
  console.log(`TechStore API escuchando en http://localhost:${env.port}`);
  console.log(`Credenciales semilla: admin@techstore.com / ${DEFAULT_SEED_PASSWORD}`);
});
