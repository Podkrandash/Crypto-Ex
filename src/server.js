"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var express_1 = __importDefault(require("express"));
var http_1 = __importDefault(require("http"));
var cors_1 = __importDefault(require("cors"));
var helmet_1 = __importDefault(require("helmet"));
var compression_1 = __importDefault(require("compression"));
var morgan_1 = __importDefault(require("morgan"));
var cookie_parser_1 = __importDefault(require("cookie-parser"));
var db_1 = require("./db");
var path_1 = __importDefault(require("path"));
var crypto_1 = require("crypto");
var app = (0, express_1.default)();
var server = http_1.default.createServer(app);
var PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
var ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-token";
app.use((0, helmet_1.default)());
app.use((0, compression_1.default)());
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, morgan_1.default)("dev"));
// Static
app.use(express_1.default.static(path_1.default.join(process.cwd(), "public")));
// Helpers
function getOrCreateUserId(req, res) {
    var _a;
    var cookieId = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.uid;
    if (cookieId) {
        var row = db_1.db.prepare("SELECT id, username FROM users WHERE id = ?").get(cookieId);
        if (row)
            return { userId: row.id, username: row.username };
    }
    var id = (0, crypto_1.randomUUID)();
    var username = "user_".concat(id.slice(0, 8));
    var now = new Date().toISOString();
    db_1.db.prepare("INSERT INTO users (id, username, createdAt) VALUES (?, ?, ?)").run(id, username, now);
    res.cookie("uid", id, { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 365 });
    return { userId: id, username: username };
}
// Bootstrap endpoint
app.get("/api/bootstrap", function (req, res) {
    var _a = getOrCreateUserId(req, res), userId = _a.userId, username = _a.username;
    res.json({ userId: userId, username: username });
});
// Admin auth middleware
function requireAdmin(req, res, next) {
    var auth = req.headers.authorization || "";
    var token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (token !== ADMIN_TOKEN)
        return res.status(401).json({ error: "unauthorized" });
    next();
}
// Wallets CRUD (admin)
app.get("/api/admin/wallets", requireAdmin, function (req, res) {
    var rows = db_1.db.prepare("SELECT id, currency, network, address, updatedAt FROM wallets ORDER BY currency, network").all();
    res.json(rows);
});
app.post("/api/admin/wallets", requireAdmin, function (req, res) {
    var _a = req.body, currency = _a.currency, network = _a.network, address = _a.address;
    if (!currency || !network || !address)
        return res.status(400).json({ error: "currency, network, address required" });
    var now = new Date().toISOString();
    var id = (0, crypto_1.randomUUID)();
    var upsert = db_1.db.prepare("INSERT INTO wallets (id, currency, network, address, updatedAt) VALUES (?, ?, ?, ?, ?) " +
        "ON CONFLICT(currency, network) DO UPDATE SET address = excluded.address, updatedAt = excluded.updatedAt");
    upsert.run(id, currency, network, address, now);
    res.json({ ok: true });
});
// Public wallet fetch
app.get("/api/wallet", function (req, res) {
    var currency = String(req.query.currency || "");
    var network = String(req.query.network || "");
    if (!currency || !network)
        return res.status(400).json({ error: "currency and network required" });
    var row = db_1.db.prepare("SELECT address FROM wallets WHERE currency = ? AND network = ?").get(currency, network);
    if (!row)
        return res.status(404).json({ error: "wallet not configured" });
    res.json({ address: row.address });
});
// Create exchange request with permanent limits
app.post("/api/exchange", function (req, res) {
    var userId = getOrCreateUserId(req, res).userId;
    var _a = req.body, fromCurrency = _a.fromCurrency, network = _a.network, toType = _a.toType, amountUsd = _a.amountUsd;
    if (!fromCurrency || !network || !toType || typeof amountUsd !== "number") {
        return res.status(400).json({ error: "fromCurrency, network, toType, amountUsd required" });
    }
    // Validate permanent limits
    var maxLimit = 10000;
    var minLimit = toType === "CASH_RU" ? 100 : 10;
    if (amountUsd < minLimit || amountUsd > maxLimit) {
        return res.status(400).json({ error: "Лимиты: от $".concat(minLimit, " до $").concat(maxLimit) });
    }
    // Wallet address must exist
    var wallet = db_1.db.prepare("SELECT address FROM wallets WHERE currency = ? AND network = ?").get(fromCurrency, network);
    if (!wallet)
        return res.status(400).json({ error: "Кошелёк не настроен админом" });
    var id = (0, crypto_1.randomUUID)();
    var now = new Date().toISOString();
    db_1.db.prepare("INSERT INTO exchanges (id, userId, fromCurrency, network, toType, amountUsd, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)").run(id, userId, fromCurrency, network, toType, amountUsd, now);
    var TELEGRAM_EXECUTOR = process.env.TELEGRAM_EXECUTOR || process.env.TELEGRAM_HANDLE || "your_telegram";
    res.json({ exchangeId: id, walletAddress: wallet.address, telegram: TELEGRAM_EXECUTOR, note: toType === "CASH_RU" ? "Внимание: повышенная комиссия на наличные из-за логистики." : undefined });
});
// Admin: list exchanges
app.get("/api/admin/exchanges", requireAdmin, function (req, res) {
    var search = String(req.query.search || "").trim();
    if (search) {
        var rows = db_1.db.prepare("SELECT * FROM exchanges WHERE id LIKE ? ORDER BY createdAt DESC").all("%".concat(search, "%"));
        return res.json(rows);
    }
    var rows = db_1.db.prepare("SELECT * FROM exchanges ORDER BY createdAt DESC").all();
    res.json(rows);
});
// Admin: update status
app.post("/api/admin/exchanges/:id/status", requireAdmin, function (req, res) {
    var id = req.params.id;
    var status = req.body.status;
    if (!status)
        return res.status(400).json({ error: "status required" });
    db_1.db.prepare("UPDATE exchanges SET status = ? WHERE id = ?").run(status, id);
    res.json({ ok: true });
});
// Delete exchange (admin)
app.delete("/api/admin/exchanges/:id", requireAdmin, function (req, res) {
    var id = req.params.id;
    db_1.db.prepare("DELETE FROM exchanges WHERE id = ?").run(id);
    db_1.db.prepare("DELETE FROM messages WHERE exchangeId = ?").run(id);
    res.json({ ok: true });
});
// Serve admin page path fallback
app.get("/admin", function (req, res) {
    res.sendFile(path_1.default.join(process.cwd(), "public", "admin", "index.html"));
});
server.listen(PORT, function () {
    console.log("Server listening on http://localhost:".concat(PORT));
});
