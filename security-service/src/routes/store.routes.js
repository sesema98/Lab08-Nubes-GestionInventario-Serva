const express = require("express");
const { query } = require("../db/pool");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

router.get(
  "/",
  wrapRoute(async (_req, res) => {
    const result = await query("SELECT id, name, created_at FROM stores ORDER BY id");
    res.json({ stores: result.rows });
  })
);

module.exports = router;
