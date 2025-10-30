import { buildDashboardData } from "../services/budgetService.js";

export async function getDashboard(req, res) {
  const userId = Number(req.query.userId || 0);
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const data = await buildDashboardData(userId);
    if (!data) return res.status(200).json(null);
    res.json(data);
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
