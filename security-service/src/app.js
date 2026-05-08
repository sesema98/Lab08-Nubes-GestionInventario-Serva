const cors = require("cors");
const express = require("express");
const env = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const auditRoutes = require("./routes/audit.routes");
const metaRoutes = require("./routes/meta.routes");
const productRoutes = require("./routes/product.routes");
const reportRoutes = require("./routes/report.routes");
const roleRoutes = require("./routes/role.routes");
const storeRoutes = require("./routes/store.routes");
const userRoutes = require("./routes/user.routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(
  cors({
    origin: env.corsOrigin.split(",").map((item) => item.trim()),
    credentials: true,
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "techstore-security-service",
  });
});

app.use("/api/meta", metaRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/audit-logs", auditRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/reports", reportRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
};
