const express = require("express");
const { getDb } = require("../db/connection");
const { wrapRoute } = require("../utils/route");

const router = express.Router();

router.get(
  "/",
  wrapRoute(async (_req, res) => {
    const db = getDb();
    const stores = db.prepare("SELECT * FROM tiendas ORDER BY id").all();
    res.json({ stores });
  })
);

module.exports = router;
