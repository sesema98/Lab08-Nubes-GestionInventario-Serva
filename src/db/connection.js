const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const env = require("../config/env");

let db;

function getDb() {
  if (!db) {
    if (env.dbFile !== ":memory:") {
      fs.mkdirSync(path.dirname(env.dbFile), { recursive: true });
    }

    db = new Database(env.dbFile);
    db.pragma("foreign_keys = ON");
  }

  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = undefined;
  }
}

module.exports = {
  getDb,
  closeDb,
};
