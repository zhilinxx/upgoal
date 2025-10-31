import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";   // import connectDB
import authRoutes from "./routes/auth.js";
import incomeRoutes from "./routes/incomeRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import insuranceRoutes from "./routes/insuranceRoutes.js";
import budgetRoutes from "./routes/budgetRoutes.js";
import accountRoutes from "./routes/accountRoutes.js";
import insurancePlanRoutes from "./routes/insurancePlanRoutes.js";

dotenv.config();
await connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Connect to DB before starting server
connectDB()
  .then(() => {
    console.log("✅ MySQL connection ready");

    app.use(express.json());
    app.use(cookieParser());
    app.use("/uploads", express.static(path.join(process.cwd(), "src/uploads")));

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
    app.use("/api/profile", profileRoutes);
    app.use("/api/insurance", insuranceRoutes);
    app.get("/api", (req, res) => {
      res.json({
        ok: true,
        msg: "Hello from backend",
        at: new Date().toISOString(),
      });
    });
    app.use("/api/budget", budgetRoutes);
    app.use("/api/income", incomeRoutes);
    app.use("/api/accounts", accountRoutes);
    app.use("/api/insurancePlans", insurancePlanRoutes);


    app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error("❌ Database connection failed:", err);
    process.exit(1);
  });

import { errorHandler } from './middlewares/errorHandler.js';
app.use(errorHandler);