// server/controllers/budgetController.js
import { buildDashboardData } from "../services/budgetService.js";

export async function getDashboard(req, res) {
  const userIdRaw = req.query.userId;

  // 1) Validate userId early
  if (userIdRaw === undefined || userIdRaw === null || userIdRaw === "") {
    return res.status(400).json({ error: "Missing userId" });
  }
  const userId = Number(userIdRaw);
  if (!Number.isFinite(userId) || userId <= 0) {
    return res.status(400).json({ error: "Invalid userId" });
  }

  try {
    console.log("[GET] /api/budget/dashboard userId=", userId);

    const data = await buildDashboardData(userId);

    // 2) If no income row / nothing to show
    if (!data) {
      // 404 is clearer than 200 null — client can handle this as "no setup yet"
      return res.status(404).json({ error: "No income found for user" });
    }

    // 3) Success
    return res.json(data);
  } catch (err) {
    // 4) Log useful details so 500s are debuggable
    const msg = err?.message || String(err);
    console.error("[/api/budget/dashboard] ERROR:", msg);
    if (err?.stack) console.error(err.stack);

    // Optional: pass a bit more context back while still generic
    return res.status(500).json({
      error: "Failed to build dashboard",
      details: process.env.NODE_ENV !== "production" ? msg : undefined,
    });
  }
}
