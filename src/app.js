const express = require("express");
const authRoutes = require("./routes/auth.routes");
const roleRoutes = require("./routes/role.routes");
const userRoutes = require("./routes/user.routes");
const productRoutes = require("./routes/product.routes");
const storeRoutes = require("./routes/store.routes");
const { errorHandler, notFoundHandler } = require("./middlewares/error.middleware");

const app = express();

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "techstore-security-api",
  });
});

app.use("/api/stores", storeRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = {
  app,
};
