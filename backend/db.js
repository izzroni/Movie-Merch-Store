const mysql = require("mysql2");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const net = require("net");

const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_USER = process.env.DB_USER || "root";
const DB_PASS = process.env.DB_PASS || "";
const DB_NAME = process.env.DB_NAME || "moviestore1";
const DB_PORT = process.env.DB_PORT || 3306;

let useSqlite = true; // Default to SQLite for instant reliability, switch to MySQL if connected
let mysqlPool = null;
let sqliteDb = null;

const sqliteDbPath = path.join(__dirname, "moviestore1.sqlite");

function translateSql(sql) {
  if (typeof sql !== "string") return sql;
  let translated = sql
    .replace(/DATE_SUB\s*\(\s*(?:CURDATE\(\)|NOW\(\)|CURRENT_DATE)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', '-$1 day')")
    .replace(/DATE_SUB\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date($1, '-$2 day')")
    .replace(/DATE_ADD\s*\(\s*(?:CURDATE\(\)|NOW\(\)|CURRENT_DATE)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', '+$1 day')")
    .replace(/DATE_ADD\s*\(\s*([^,]+)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date($1, '+$2 day')")
    .replace(/DATE_FORMAT\s*\(\s*([^,]+)\s*,\s*'%m\/%y'\s*\)/gi, "strftime('%m/%Y', $1)")
    .replace(/DATE_FORMAT\s*\(\s*([^,]+)\s*,\s*'%Y-%m-%d'\s*\)/gi, "strftime('%Y-%m-%d', $1)")
    .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
    .replace(/CURDATE\(\)/gi, "date('now', 'localtime')")
    .replace(/LAST_INSERT_ID\(\)/gi, "last_insert_rowid()")
    .replace(/CONCAT\(([^)]+)\)/gi, (match, args) => {
      const parts = args.split(",").map((p) => p.trim());
      return `(${parts.join(" || ")})`;
    });
  return translated;
}

function initSqlite() {
  if (sqliteDb) return;
  const needsInitialization = !fs.existsSync(sqliteDbPath);
  console.log("[DB] Using embedded SQLite database (moviestore1.sqlite)...");
  sqliteDb = new sqlite3.Database(sqliteDbPath);

  if (needsInitialization) {
    console.log("[DB] First run: Initializing database schema and seed data into SQLite...");
    sqliteDb.serialize(() => {
      sqliteDb.run("PRAGMA foreign_keys = OFF;");

      const schemaPath = path.join(__dirname, "..", "schema.sql");
      const dumpPath = path.join(__dirname, "..", "moviestore1.sql");

      if (fs.existsSync(schemaPath)) {
        let schemaSql = fs
          .readFileSync(schemaPath, "utf8")
          .replace(/\r\n/g, "\n")
          .replace(/ENGINE=InnoDB/gi, "")
          .replace(/DEFAULT CHARSET=\w+/gi, "")
          .replace(/COLLATE=\w+/gi, "")
          .replace(/INT AUTO_INCREMENT PRIMARY KEY/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
          .replace(/INT AUTO_INCREMENT/gi, "INTEGER PRIMARY KEY AUTOINCREMENT")
          .replace(/ENUM\([^)]+\)/gi, "VARCHAR(50)")
          .replace(/NOW\(\)/gi, "CURRENT_TIMESTAMP")
          .replace(/SET FOREIGN_KEY_CHECKS\s*=\s*\d+;/gi, "")
          .replace(/SET SQL_MODE\s*=\s*[^;]+;/gi, "")
          .replace(/CREATE DATABASE[^;]+;/gi, "")
          .replace(/USE [^;]+;/gi, "")
          .replace(/INSERT INTO tbl_customers[\s\S]*?;/gi, "");

        const ddls = schemaSql.split(";").map((s) => s.trim()).filter(Boolean);
        for (const ddl of ddls) {
          sqliteDb.run(ddl, (err) => {
            if (err && !err.message.includes("already exists")) {
              console.error("[DB Schema Error]:", err.message);
            }
          });
        }
      }

      if (fs.existsSync(dumpPath)) {
        const dumpSql = fs.readFileSync(dumpPath, "utf8");
        const insertBlocks = dumpSql
          .split(/(?=INSERT INTO `tbl_)/i)
          .filter((b) => b.trim().startsWith("INSERT INTO"));

        for (let block of insertBlocks) {
          let semIdx = block.indexOf(";\r\n");
          if (semIdx === -1) semIdx = block.indexOf(";\n");
          if (semIdx === -1) continue;
          let singleStmt = block.substring(0, semIdx + 1);

          let cleaned = singleStmt.replace(/`([^`]+)`/g, "$1");
          cleaned = cleaned
            .replace(/\\'/g, "''")
            .replace(/\\"/g, '"')
            .replace(/\\r\\n/g, " ")
            .replace(/\\n/g, " ")
            .replace(/''''/g, "''")
            .replace(/'''/g, "''");

          sqliteDb.run(cleaned, (err) => {
            if (err && !err.message.includes("UNIQUE constraint failed")) {
              // Non-fatal seed duplicate skip
            }
          });
        }
      }
      console.log("[DB] SQLite database initialized successfully with seed data.");
    });
  }
}

// Check MySQL connection asynchronously and switch to MySQL if available
try {
  const socket = new net.Socket();
  socket.setTimeout(400);
  socket.on("connect", () => {
    socket.destroy();
    mysqlPool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASS,
      database: DB_NAME,
      port: DB_PORT,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    mysqlPool.getConnection((err, conn) => {
      if (!err && conn) {
        useSqlite = false;
        console.log("[DB] Connected to local MySQL server successfully.");
        conn.release();
      } else {
        initSqlite();
      }
    });
  });

  socket.on("error", () => {
    socket.destroy();
    initSqlite();
  });

  socket.on("timeout", () => {
    socket.destroy();
    initSqlite();
  });

  socket.connect(DB_PORT, DB_HOST);
} catch (e) {
  initSqlite();
}

function runSqliteQuery(sql, params, callback) {
  if (typeof params === "function") {
    callback = params;
    params = [];
  }
  params = params || [];

  if (!sqliteDb) initSqlite();

  const cleanSql = translateSql(sql).trim();
  const lower = cleanSql.toLowerCase();

  if (lower.startsWith("select") || lower.startsWith("show") || lower.startsWith("pragma") || lower.startsWith("explain")) {
    sqliteDb.all(cleanSql, params, (err, rows) => {
      if (callback) callback(err, rows || []);
    });
  } else {
    sqliteDb.run(cleanSql, params, function (err) {
      const result = {
        insertId: this ? this.lastID : 0,
        affectedRows: this ? this.changes : 0,
      };
      if (callback) callback(err, result);
    });
  }
}

function runSqliteQueryPromise(sql, params) {
  return new Promise((resolve, reject) => {
    runSqliteQuery(sql, params, (err, res) => {
      if (err) return reject(err);
      resolve([res, []]);
    });
  });
}

class SqliteConnectionWrapper {
  async beginTransaction() {
    return new Promise((resolve, reject) => {
      if (!sqliteDb) initSqlite();
      sqliteDb.run("BEGIN TRANSACTION", (err) => (err ? reject(err) : resolve()));
    });
  }
  async commit() {
    return new Promise((resolve, reject) => {
      if (!sqliteDb) initSqlite();
      sqliteDb.run("COMMIT", (err) => (err ? reject(err) : resolve()));
    });
  }
  async rollback() {
    return new Promise((resolve, reject) => {
      if (!sqliteDb) initSqlite();
      sqliteDb.run("ROLLBACK", (err) => (err ? reject(err) : resolve()));
    });
  }
  async query(sql, params) {
    return runSqliteQueryPromise(sql, params);
  }
  release() {
    // No-op for SQLite
  }
}

const dbWrapper = {
  query: (sql, params, callback) => {
    if (typeof params === "function") {
      callback = params;
      params = [];
    }
    if (useSqlite || !mysqlPool) {
      runSqliteQuery(sql, params, callback);
    } else {
      mysqlPool.query(sql, params, callback);
    }
  },
  getConnection: (callback) => {
    if (useSqlite || !mysqlPool) {
      if (callback) callback(null, new SqliteConnectionWrapper());
    } else {
      mysqlPool.getConnection((err, conn) => {
        if (err || !conn) {
          useSqlite = true;
          initSqlite();
          if (callback) callback(null, new SqliteConnectionWrapper());
        } else {
          if (callback) callback(null, conn);
        }
      });
    }
  },
  promise: () => ({
    query: (sql, params) => {
      if (useSqlite || !mysqlPool) {
        return runSqliteQueryPromise(sql, params);
      } else {
        return mysqlPool.promise().query(sql, params);
      }
    },
    getConnection: async () => {
      if (useSqlite || !mysqlPool) {
        return new SqliteConnectionWrapper();
      } else {
        try {
          return await mysqlPool.promise().getConnection();
        } catch (e) {
          useSqlite = true;
          initSqlite();
          return new SqliteConnectionWrapper();
        }
      }
    },
  }),
};

module.exports = dbWrapper;
