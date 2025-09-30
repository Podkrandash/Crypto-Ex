"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var better_sqlite3_1 = __importDefault(require("better-sqlite3"));
var fs_1 = require("fs");
var path_1 = require("path");
var dataDir = (0, path_1.join)(process.cwd(), "data");
if (!(0, fs_1.existsSync)(dataDir)) {
    (0, fs_1.mkdirSync)(dataDir);
}
var dbPath = (0, path_1.join)(dataDir, "app.sqlite");
exports.db = new better_sqlite3_1.default(dbPath);
exports.db.pragma("journal_mode = WAL");
exports.db.exec("\nCREATE TABLE IF NOT EXISTS users (\n  id TEXT PRIMARY KEY,\n  username TEXT NOT NULL,\n  createdAt TEXT NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS exchanges (\n  id TEXT PRIMARY KEY,\n  userId TEXT NOT NULL,\n  fromCurrency TEXT NOT NULL,\n  network TEXT NOT NULL,\n  toType TEXT NOT NULL,\n  amountUsd REAL NOT NULL,\n  status TEXT NOT NULL,\n  createdAt TEXT NOT NULL,\n  FOREIGN KEY(userId) REFERENCES users(id)\n);\n\nCREATE TABLE IF NOT EXISTS messages (\n  id TEXT PRIMARY KEY,\n  exchangeId TEXT NOT NULL,\n  sender TEXT NOT NULL,\n  text TEXT NOT NULL,\n  createdAt TEXT NOT NULL,\n  FOREIGN KEY(exchangeId) REFERENCES exchanges(id)\n);\n\nCREATE TABLE IF NOT EXISTS wallets (\n  id TEXT PRIMARY KEY,\n  currency TEXT NOT NULL,\n  network TEXT NOT NULL,\n  address TEXT NOT NULL,\n  updatedAt TEXT NOT NULL,\n  UNIQUE(currency, network)\n);\n");
