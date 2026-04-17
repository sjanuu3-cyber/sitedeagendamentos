const { Pool } = require("pg");

const ssl =
  process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl,
});

module.exports = {
  pool,
  query(text, params) {
    return pool.query(text, params);
  },
  getClient() {
    return pool.connect();
  },
};
