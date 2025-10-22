import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Log every request so you SEE if this process handles it
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} origin=${req.headers.origin || "(none)"}`);
  next();
});

// Manual CORS — NO WILDCARD
const ALLOWED = new Set(["http://localhost:5173"]);
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED.has(origin)) {
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin); // echo exact origin
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json());
app.use(cookieParser());

// Simple health route your App.jsx hits
app.get("/api", (req, res) => {
  res.json({ ok: true, msg: "Hello from backend", at: new Date().toISOString() });
});

// Temp login to prove cookies work
app.post("/api/auth/login", (req, res) => {
  res.cookie("refreshToken", "dev-refresh", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ accessToken: "dev-access", role: 0 });
});

// JSON 404 (avoid HTML/doctype)
app.use((req, res) => res.status(404).json({ error: "Not found", path: req.path }));

app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
