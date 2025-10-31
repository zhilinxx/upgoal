import axios from "axios";
import {
  getLatestIncome,
  getMonthlyCommitments,
  getRecentExpenses,
  getSavingsGoals,
} from "../repositories/budgetRepository.js";

const COLORS = ["#ff7b8c", "#f8a9a8", "#ffb9b6", "#c4e0b5", "#b3d4ff", "#ffd27f"];
const pickColors = (n) => Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

export async function buildDashboardData(userId) {
  // --- Fetch from repository layer ---
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;

  const { net_income: netIncome, lifestyle } = incomeRow;
  const commitments = await getMonthlyCommitments(userId);
  const expenses = await getRecentExpenses(userId);
  const goals = await getSavingsGoals(userId);

  // --- Commitments classification ---
  let housingLoan = 0, carLoan = 0, insurance = 0, others = 0;
  for (const r of commitments) {
    const t = (r.type || "").toLowerCase();
    const amt = Number(r.amount || 0);
    if (t.includes("house") || t.includes("mortgage") || t.includes("rent")) housingLoan += amt;
    else if (t.includes("car") || t.includes("vehicle") || t.includes("auto")) carLoan += amt;
    else if (t.includes("insurance")) insurance += amt;
    else others += amt;
  }
  const commitmentsTotal = housingLoan + carLoan + insurance + others;

  // --- AI / Fallback ratios ---
  let aiAdvice = null;
  try {
    const { data } = await axios.post(
      process.env.AI_BUDGET_URL || "http://localhost:5002/api/segment",
      { income: Number(netIncome), commitments: { housingLoan, carLoan, insurance, others }, lifestyle },
      { timeout: 2000 }
    );
    aiAdvice = data;
  } catch (err) {
    console.error("AI offline, using fallback:", err.message);
    aiAdvice = fallbackRatios(lifestyle);
  }

  // --- Allocation and rules ---
  const result = allocateBudget(Number(netIncome), commitmentsTotal, aiAdvice.ratios);

  // --- Prepare final structure ---
  const breakdown = [
    { name: "Essentials", amount: result.essentials },
    { name: "Savings", amount: result.savings },
    { name: "Insurance", amount: result.insBucket },
    { name: "Other", amount: result.other },
  ].map((row, i) => ({ ...row, color: pickColors(4)[i] }));

  const savingsGoals = goals.map(g => ({
    id: g.id, name: g.name, current: Number(g.current || 0),
    target: Number(g.target || 0), deadline: g.deadline,
  }));

  const expensesList = expenses.map(e => ({ name: e.name, amount: Number(e.amount || 0) }));

  return {
    income: Number(netIncome),
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    ai: { source: aiAdvice.label ? "ai" : "fallback", segment: aiAdvice.label || "fallback" },
  };
}

// --- Allocation logic moved here ---
function allocateBudget(income, commitmentsTotal, r) {
  const ratios = r || { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 };
  let essentials = Math.max(commitmentsTotal, ratios.essentials * income);
  let remaining = Math.max(0, income - essentials);

  const wSum = ratios.savings + ratios.insurance + ratios.other || 1;
  let savings = (remaining * ratios.savings) / wSum;
  let insBucket = (remaining * ratios.insurance) / wSum;
  let other = (remaining * ratios.other) / wSum;

  // rule-based tuning
  const minSavings = 0.20 * income;
  const maxInsurance = 0.15 * income;
  const minInsurance = 0.05 * income;

  insBucket = Math.min(Math.max(insBucket, minInsurance), maxInsurance);
  let flex = income - essentials - insBucket;
  savings = Math.min(Math.max(savings, minSavings), flex);
  other = Math.max(income - essentials - insBucket - savings, 0);

  // rounding fix
  const round2 = n => Math.round(n * 100) / 100;
  essentials = round2(essentials);
  savings = round2(savings);
  insBucket = round2(insBucket);
  other = round2(other);
  const diff = round2(income - (essentials + savings + insBucket + other));
  other = round2(other + diff);

  return { essentials, savings, insBucket, other };
}

function fallbackRatios(lifestyle) {
  const table = {
    None: { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Frugal: { essentials: 0.50, savings: 0.30, insurance: 0.10, other: 0.10 },
    Balanced: { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Luxury: { essentials: 0.60, savings: 0.20, insurance: 0.10, other: 0.10 },
  };
  return { segment: "fallback", ratios: table[lifestyle] || table.None };
}
