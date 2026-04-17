const mysql = require("mysql2/promise");

function buildSslConfig() {
  return process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined;
}

function buildConnectionConfig() {
  const ssl = buildSslConfig();

  if (process.env.DATABASE_URL) {
    const connectionUrl = new URL(process.env.DATABASE_URL);

    return {
      host: connectionUrl.hostname,
      port: Number(connectionUrl.port || 3306),
      user: decodeURIComponent(connectionUrl.username),
      password: decodeURIComponent(connectionUrl.password),
      database: connectionUrl.pathname.replace(/^\//, ""),
      ssl,
    };
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl,
  };
}

function normalizeResult(rows, fields) {
  if (Array.isArray(rows)) {
    return {
      rows,
      fields,
      rowCount: rows.length,
      affectedRows: 0,
      insertId: null,
    };
  }

  return {
    rows: [],
    fields,
    rowCount: rows.affectedRows || 0,
    affectedRows: rows.affectedRows || 0,
    insertId: rows.insertId || null,
  };
}

const pool = mysql.createPool({
  ...buildConnectionConfig(),
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE || 10),
  queueLimit: 0,
  charset: "utf8mb4",
  dateStrings: true,
});

module.exports = {
  pool,
  async query(text, params = []) {
    const [rows, fields] = await pool.query(text, params);
    return normalizeResult(rows, fields);
  },
  async getClient() {
    const connection = await pool.getConnection();

    return {
      async query(text, params = []) {
        const [rows, fields] = await connection.query(text, params);
        return normalizeResult(rows, fields);
      },
      async beginTransaction() {
        await connection.beginTransaction();
      },
      async commit() {
        await connection.commit();
      },
      async rollback() {
        await connection.rollback();
      },
      release() {
        connection.release();
      },
    };
  },
};
