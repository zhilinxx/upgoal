import express from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";   // ✅ import connectDB
import authRoutes from "./routes/auth.js";
import incomeRoutes from "./routes/incomeRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect to DB before starting server
connectDB()
  .then(() => {
    console.log("✅ MySQL connection ready");

    app.use(express.json());
    app.use(cookieParser());

    // CORS + routes (keep your previous CORS config)
    const ALLOWED = new Set(["http://localhost:5173"]);
    app.use((req, res, next) => {
      const origin = req.headers.origin;
      if (!origin || ALLOWED.has(origin)) {
        if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS");
      }
      if (req.method === "OPTIONS") return res.sendStatus(204);
      next();
    });

    app.use("/api/auth", authRoutes);
    app.use("/api/income", incomeRoutes);

    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });
