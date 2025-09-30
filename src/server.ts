import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import { db } from "./db";
import { FiatType } from "./types";
import path from "path";

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "dev-admin-token";
const TELEGRAM_EXECUTOR = process.env.TELEGRAM_EXECUTOR || process.env.TELEGRAM_HANDLE || "your_telegram";

app.use(helmet());
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Static
app.use(express.static(path.join(process.cwd(), "public")));

// Helpers
function getOrCreateUserId(req: express.Request, res: express.Response): { userId: string; username: string } {
    const cookieId = req.cookies?.uid as string | undefined;
    if (cookieId) {
        const row = db.prepare("SELECT id, username FROM users WHERE id = ?").get(cookieId) as { id: string; username: string } | undefined;
        if (row) return { userId: row.id, username: row.username };
    }
    const id = uuidv4();
    const username = `user_${id.slice(0, 8)}`;
    const now = new Date().toISOString();
    db.prepare("INSERT INTO users (id, username, createdAt) VALUES (?, ?, ?)").run(id, username, now);
    res.cookie("uid", id, { httpOnly: true, sameSite: "lax", maxAge: 1000 * 60 * 60 * 24 * 365 });
    return { userId: id, username };
}

// Bootstrap endpoint
app.get("/api/bootstrap", (req, res) => {
    const { userId, username } = getOrCreateUserId(req, res);
    res.json({ userId, username });
});

// Admin auth middleware
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
    if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
    next();
}

// Wallets CRUD (admin)
app.get("/api/admin/wallets", requireAdmin, (req, res) => {
    const rows = db.prepare("SELECT id, currency, network, address, updatedAt FROM wallets ORDER BY currency, network").all();
    res.json(rows);
});

app.post("/api/admin/wallets", requireAdmin, (req, res) => {
    const { currency, network, address } = req.body as { currency?: string; network?: string; address?: string };
    if (!currency || !network || !address) return res.status(400).json({ error: "currency, network, address required" });
    const now = new Date().toISOString();
    const id = uuidv4();
    const upsert = db.prepare(
        "INSERT INTO wallets (id, currency, network, address, updatedAt) VALUES (?, ?, ?, ?, ?) " +
        "ON CONFLICT(currency, network) DO UPDATE SET address = excluded.address, updatedAt = excluded.updatedAt"
    );
    upsert.run(id, currency, network, address, now);
    res.json({ ok: true });
});

// Public wallet fetch
app.get("/api/wallet", (req, res) => {
    const currency = String(req.query.currency || "");
    const network = String(req.query.network || "");
    if (!currency || !network) return res.status(400).json({ error: "currency and network required" });
    const row = db.prepare("SELECT address FROM wallets WHERE currency = ? AND network = ?").get(currency, network) as { address: string } | undefined;
    if (!row) return res.status(404).json({ error: "wallet not configured" });
    res.json({ address: row.address });
});

// Create exchange request with first-time limits
app.post("/api/exchange", (req, res) => {
    const { userId } = getOrCreateUserId(req, res);
    const { fromCurrency, network, toType, amountUsd } = req.body as {
        fromCurrency?: string;
        network?: string;
        toType?: FiatType;
        amountUsd?: number;
    };
    if (!fromCurrency || !network || !toType || typeof amountUsd !== "number") {
        return res.status(400).json({ error: "fromCurrency, network, toType, amountUsd required" });
    }

    // Validate permanent limits
    const maxLimit = 10000;
    const minLimit = toType === "CASH_RU" ? 100 : 10;
    if (amountUsd < minLimit || amountUsd > maxLimit) {
        return res.status(400).json({ error: `Лимиты: от $${minLimit} до $${maxLimit}` });
    }

    // Wallet address must exist
    const wallet = db.prepare("SELECT address FROM wallets WHERE currency = ? AND network = ?").get(fromCurrency, network) as { address: string } | undefined;
    if (!wallet) return res.status(400).json({ error: "Кошелёк не настроен админом" });

    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
        "INSERT INTO exchanges (id, userId, fromCurrency, network, toType, amountUsd, status, createdAt) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)"
    ).run(id, userId, fromCurrency, network, toType, amountUsd, now);

    res.json({ exchangeId: id, walletAddress: wallet.address, telegram: TELEGRAM_EXECUTOR, note: toType === "CASH_RU" ? "Внимание: повышенная комиссия на наличные из-за логистики." : undefined });
});

// Admin: list exchanges
app.get("/api/admin/exchanges", requireAdmin, (req, res) => {
    const search = String(req.query.search || "").trim();
    if (search) {
        const rows = db.prepare("SELECT * FROM exchanges WHERE id LIKE ? ORDER BY createdAt DESC").all(`%${search}%`);
        return res.json(rows);
    }
    const rows = db.prepare("SELECT * FROM exchanges ORDER BY createdAt DESC").all();
    res.json(rows);
});

// Admin: update status
app.post("/api/admin/exchanges/:id/status", requireAdmin, (req, res) => {
    const id = req.params.id;
    const { status } = req.body as { status?: "pending" | "in_chat" | "completed" | "cancelled" };
    if (!status) return res.status(400).json({ error: "status required" });
    db.prepare("UPDATE exchanges SET status = ? WHERE id = ?").run(status, id);
    res.json({ ok: true });
});

// Delete exchange (admin)
app.delete("/api/admin/exchanges/:id", requireAdmin, (req, res) => {
    const id = req.params.id;
    db.prepare("DELETE FROM exchanges WHERE id = ?").run(id);
    db.prepare("DELETE FROM messages WHERE exchangeId = ?").run(id);
    res.json({ ok: true });
});

// Serve admin page path fallback
app.get("/admin", (req, res) => {
    res.sendFile(path.join(process.cwd(), "public", "admin", "index.html"));
});

server.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});


