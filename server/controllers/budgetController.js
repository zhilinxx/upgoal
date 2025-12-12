import { buildDashboardData } from "../services/budgetService.js";

export async function getDashboard(req, res) {
  const userIdRaw = req.query.userId;

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

    if (!data) {
      return res.status(404).json({ error: "No income found for user" });
    }

    return res.json(data);
  } catch (err) {
    const msg = err?.message || String(err);
    console.error("[/api/budget/dashboard] ERROR:", msg);
    if (err?.stack) console.error(err.stack);

    return res.status(500).json({
      error: "Failed to build dashboard",
      details: process.env.NODE_ENV !== "production" ? msg : undefined,
    });
  }
}
