import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const dataDir = process.env.DATA_DIR ? process.env.DATA_DIR : join(process.cwd(), "data");
if (!existsSync(dataDir)) {
    mkdirSync(dataDir);
}

const dbPath = join(dataDir, "app.sqlite");
export const db = new Database(dbPath);

db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  createdAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS exchanges (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  fromCurrency TEXT NOT NULL,
  network TEXT NOT NULL,
  toType TEXT NOT NULL,
  amountUsd REAL NOT NULL,
  status TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(userId) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  exchangeId TEXT NOT NULL,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  FOREIGN KEY(exchangeId) REFERENCES exchanges(id)
);

CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY,
  currency TEXT NOT NULL,
  network TEXT NOT NULL,
  address TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(currency, network)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
`);


