import pool from "../config/db.js";
import axios from "axios";

// Palette for the doughnut
const COLORS = ["#ff7b8c","#f8a9a8","#ffb9b6","#c4e0b5","#b3d4ff","#ffd27f"];

function pickColors(n) {
  return Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);
}

export async function getDashboard(req, res) {
  const userId = Number(req.query.userId || 0);
  if (!userId) return res.status(400).json({ error: "userId is required" });

  const conn = await pool.getConnection();
  try {
    // 1) Latest income + lifestyle
    const [incomeRows] = await conn.query(
      `SELECT income_id, net_income, lifestyle
         FROM incomes
        WHERE user_id = ?
        ORDER BY income_id DESC
        LIMIT 1`,
      [userId]
    );
    if (!incomeRows.length) {
      return res.status(200).json(null); // front-end shows "Go to Setup"
    }
    const { net_income: netIncome, lifestyle } = incomeRows[0];

    // 2) Commitments by type
    const [commitRows] = await conn.query(
      `SELECT commitment_type AS type, commitment_amt AS amount
         FROM monthly_commitments
        WHERE user_id = ?`,
      [userId]
    );

    const commitmentsTotal = commitRows.reduce((s, r) => s + Number(r.amount || 0), 0);

    // 3) Recent expenses (last 30 days)
    const [expenseRows] = await conn.query(
      `SELECT name, ABS(amount) AS amount
         FROM transactions
        WHERE user_id = ?
          AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
          AND amount > 0
        ORDER BY created_at DESC
        LIMIT 30`,
      [userId]
    );

    // 4) Optional savings goals
    const [goalRows] = await conn.query(
      `SELECT goal_id AS id, name, current_amt AS current, target_amt AS target, deadline
         FROM savings_goals
        WHERE user_id = ?
        ORDER BY goal_id DESC
        LIMIT 5`,
      [userId]
    );

    // === AI segment: send features and get recommended ratios ===
    // Features you can craft: income, commitments ratio, (optional) savings ratio from history etc.
    const features = {
      income: Number(netIncome),
      commitmentsRatio: commitmentsTotal > 0 ? commitmentsTotal / netIncome : 0,
      // more features can be added later (age, lifestyle, risk, volatility…)
    };

    let aiAdvice = null;
    try {
      // If you run the AI service locally on 5001 (see section 3)
      const { data } = await axios.post(
        process.env.AI_BASE_URL || "http://localhost:5001/predict-segment",
        features,
        { timeout: 2000 }
      );
      aiAdvice = data; // { segment: 'conservative'|'balanced'|'overspender', ratios: { essentials, savings, insurance, other } }
    } catch {
      // fallback if AI is offline -> simple lifestyle default
      aiAdvice = fallbackRatios(lifestyle);
    }

    // Build breakdown rows from AI ratios, but enforce commitments as part of Essentials bucket.
    const ratios = aiAdvice.ratios; // values sum to 1
    const essentials = Math.max(commitmentsTotal, ratios.essentials * netIncome);
    const savings    = ratios.savings   * netIncome;
    const insurance  = ratios.insurance * netIncome;
    const other      = Math.max(0, netIncome - (essentials + savings + insurance));

    const breakdown = [
      { name: "Essentials", amount: round2(essentials) },
      { name: "Savings",    amount: round2(savings) },
      { name: "Insurance",  amount: round2(insurance) },
      { name: "Other",      amount: round2(other) },
    ].map((row, i) => ({ ...row, color: pickColors(4)[i] }));

    const savingsGoals = goalRows.map(g => ({
      id: g.id, name: g.name, current: Number(g.current), target: Number(g.target), deadline: g.deadline
    }));

    const expenses = expenseRows.map(e => ({
      name: e.name, amount: Number(e.amount)
    }));

    res.json({
      income: Number(netIncome),
      currency: "RM",
      breakdown,
      savingsGoals,
      expenses
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  } finally {
    conn.release();
  }
}

function round2(n){ return Math.round(Number(n) * 100) / 100; }

// Default ratios if AI isn’t available
function fallbackRatios(lifestyle) {
  // tweak as you like
  const table = {
    None:      { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Frugal:    { essentials: 0.50, savings: 0.30, insurance: 0.10, other: 0.10 },
    Balanced:  { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Luxury:    { essentials: 0.60, savings: 0.20, insurance: 0.10, other: 0.10 },
  };
  const ratios = table[lifestyle] || table.None;
  return { segment: "fallback", ratios };
}
