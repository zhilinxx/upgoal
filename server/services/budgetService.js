import axios from "axios";
import {
  getLatestIncome,
  getMonthlyCommitments,
  getRecentExpenses,
  getSavingsGoals,
  getOtherSpendThisMonth,
  getOtherSpendLastMonth,
} from "../repositories/budgetRepository.js";

const COLORS = ["#ff7b8c", "#f8a9a8", "#ffb9b6", "#c4e0b5"];
const pickColors = (n) => Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

export async function buildDashboardData(userId) {
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;

  const { net_income: netIncome, lifestyle } = incomeRow;
  const incomeNum = Number(netIncome) || 0;

  const otherThisMonth = Number(await getOtherSpendThisMonth(userId) || 0);
  const otherRatio = incomeNum > 0 ? otherThisMonth / incomeNum : 0;

  const commitments = (await getMonthlyCommitments(userId)) || [];
  const expenses = (await getRecentExpenses(userId)) || [];
  const goals = (await getSavingsGoals(userId)) || [];

  let housingLoan = 0, carLoan = 0, insurance = 0, others = 0;
  for (const r of commitments) {
    const t = (r?.type || "").toLowerCase();
    const amt = Number(r?.amount || 0);
    if (t.includes("house") || t.includes("mortgage") || t.includes("rent")) housingLoan += amt;
    else if (t.includes("car") || t.includes("vehicle") || t.includes("auto")) carLoan += amt;
    else if (t.includes("insurance")) insurance += amt;
    else others += amt;
  }
  const commitmentsTotal = housingLoan + carLoan + insurance + others;

  // -----------------------------
  // Step 1: base AI allocation (fallback)
  let baseRatios = { essentials: 0.55, savings: 0.25, insurance: 0.1, other: 0.1 };

  // Step 2: Cap Other if last month Other >10%
  const lastMonthOther = Number(await getOtherSpendLastMonth(userId) || 0);
  const lastMonthOtherRatio = incomeNum > 0 ? lastMonthOther / incomeNum : 0;

  let finalRatios = { ...baseRatios };
  if (lastMonthOtherRatio > 0.10) {
    // enforce cap depending on last month ratio
    let cap = 0.08; // default 8%
    if (lastMonthOtherRatio <= 0.15) cap = 0.08;
    else if (lastMonthOtherRatio <= 0.2) cap = 0.06;
    else cap = 0.05;

    const currentOther = baseRatios.other;
    const delta = currentOther - cap;

    if (delta > 0) {
      finalRatios.other = cap;
      // redistribute delta to Savings and Essentials
      const totalRedistribute = delta;
      const wSavings = 0.7, wEssentials = 0.3;
      finalRatios.savings += totalRedistribute * wSavings;
      finalRatios.essentials += totalRedistribute * wEssentials;
    }
  }

  // Step 3: Multiply ratios by available amount (net income - commitments total)
  const available = Math.max(0, incomeNum - commitmentsTotal);
  const breakdown = [
    { name: "Essentials", amount: round2(finalRatios.essentials * available) },
    { name: "Savings", amount: round2(finalRatios.savings * available) },
    { name: "Insurance", amount: round2(finalRatios.insurance * available) },
    { name: "Other", amount: round2(finalRatios.other * available) },
  ];

  // Adjust for rounding drift to ensure total = income - commitments
  const sum = breakdown.reduce((acc, b) => acc + b.amount, 0);
  const drift = round2(available - sum);
  if (drift !== 0) breakdown[1].amount += drift; // adjust savings

  const savingsGoals = goals.map(g => ({
    id: g.id,
    name: g.name,
    current: Number(g.current || 0),
    target: Number(g.target || 0),
    deadline: g.deadline,
  }));

  const expensesList = expenses.map(e => ({ name: e.name, amount: Number(e.amount || 0) }));

  return {
    income: incomeNum,
    currency: "RM",
    breakdown: breakdown.map((row, i) => ({ ...row, color: pickColors(4)[i] })),
    savingsGoals,
    expenses: expensesList,
    _lastMonthOther: lastMonthOther,
    _lastMonthOtherRatio: lastMonthOtherRatio,
  };
}

/* ===== Helpers ===== */
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
