import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let dbInstance: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (!dbInstance) {
    dbInstance = await open({
      filename: path.join(__dirname, '..', '..', 'database.sqlite'),
      driver: sqlite3.Database
    });
    // Enable Write-Ahead Logging for better concurrency
    await dbInstance.exec('PRAGMA journal_mode = WAL;');
    await dbInstance.exec('PRAGMA foreign_keys = ON;');
  }
  return dbInstance;
}

export async function initDb() {
  const db = await getDb();
  await db.exec(`
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
  
  // Seed initial accounts for testing purposes
  const count = await db.get('SELECT COUNT(*) as count FROM accounts');
  if (count.count === 0) {
    await db.exec(`
      INSERT INTO accounts (account_id, holder_name, balance, version) VALUES 
      ('ACC1001', 'John Doe', 1000.00, 1),
      ('ACC1002', 'Alice Smith', 1000.00, 1),
      ('ACC1003', 'Bob Johnson', 1000.00, 1)
    `);
  }
}
