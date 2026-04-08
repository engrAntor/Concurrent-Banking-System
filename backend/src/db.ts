import { Pool } from 'pg';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

let pgPool: Pool | null = null;
let sqliteDb: Database | null = null;

const isSupabase = !!process.env.DATABASE_URL;

export async function getDb(): Promise<{ type: 'pg' | 'sqlite', db: any }> {
  if (isSupabase) {
    if (!pgPool) {
      pgPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
    }
    return { type: 'pg', db: pgPool };
  } else {
    if (!sqliteDb) {
      sqliteDb = await open({
        filename: path.join(__dirname, '..', '..', 'database.sqlite'),
        driver: sqlite3.Database
      });
      await sqliteDb.exec('PRAGMA journal_mode = WAL;');
      await sqliteDb.exec('PRAGMA foreign_keys = ON;');
    }
    return { type: 'sqlite', db: sqliteDb };
  }
}

// Universal query runner wrapper
export async function runQuery(sql: string, params: any[] = []): Promise<any[]> {
  const { type, db } = await getDb();
  if (type === 'pg') {
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`); // Replace ? with $1, $2
    const res = await (db as Pool).query(pgSql, params);
    return res.rows;
  } else {
    return await (db as Database).all(sql, params);
  }
}

export async function runGet(sql: string, params: any[] = []): Promise<any> {
  const rows = await runQuery(sql, params);
  return rows[0] || null;
}

export async function runUpdate(sql: string, params: any[] = []): Promise<number> {
  const { type, db } = await getDb();
  if (type === 'pg') {
    let i = 1;
    const pgSql = sql.replace(/\?/g, () => `$${i++}`);
    const res = await (db as Pool).query(pgSql, params);
    return res.rowCount || 0;
  } else {
    const res = await (db as Database).run(sql, params);
    return res.changes || 0;
  }
}

export async function runExec(sql: string): Promise<void> {
  const { type, db } = await getDb();
  if (type === 'pg') {
    await (db as Pool).query(sql);
  } else {
    await (db as Database).exec(sql);
  }
}

export async function initDb() {
  const { type } = await getDb();
  
  if (type === 'pg') {
    await runExec(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id TEXT PRIMARY KEY,
        holder_name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0.00,
        version INTEGER NOT NULL DEFAULT 1,
        CHECK (balance >= 0)
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        from_account TEXT,
        to_account TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_account) REFERENCES accounts(account_id),
        FOREIGN KEY (to_account) REFERENCES accounts(account_id)
      );
    `);
  } else {
    await runExec(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id TEXT PRIMARY KEY,
        holder_name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0.00,
        version INTEGER NOT NULL DEFAULT 1,
        CHECK (balance >= 0)
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_account TEXT,
        to_account TEXT,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_account) REFERENCES accounts(account_id),
        FOREIGN KEY (to_account) REFERENCES accounts(account_id)
      );
    `);
  }

  const countRow = await runGet('SELECT COUNT(*) as count FROM accounts');
  if (parseInt(countRow.count) === 0) {
    await runExec(`
      INSERT INTO accounts (account_id, holder_name, balance, version) VALUES 
      ('ACC1001', 'Aninda Saha', 1000.00, 1),
      ('ACC1002', 'Shaid Azmin', 1000.00, 1),
      ('ACC1003', 'Farid Ahmed', 1000.00, 1)
    `);
  }
}
