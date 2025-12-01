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

  const { net_income: netIncome } = incomeRow;
  const incomeNum = Number(netIncome) || 0;

  const otherThisMonth = Number(await getOtherSpendThisMonth(userId) || 0);
  const lastMonthOther = Number(await getOtherSpendLastMonth(userId) || 0);

  const commitments = (await getMonthlyCommitments(userId)) || [];
  const expenses = (await getRecentExpenses(userId)) || [];
  const goals = (await getSavingsGoals(userId)) || [];

  let housingLoan = 0, carLoan = 0, insurance = 0, othersCommit = 0;
  for (const r of commitments) {
    const t = (r?.type || "").toLowerCase();
    const amt = Number(r?.amount || 0);
    if (t.includes("house") || t.includes("mortgage") || t.includes("rent")) housingLoan += amt;
    else if (t.includes("car") || t.includes("vehicle") || t.includes("auto")) carLoan += amt;
    else if (t.includes("insurance")) insurance += amt;
    else othersCommit += amt;
  }
  const commitTotal = housingLoan + carLoan + insurance + othersCommit;

  // Base fallback ratios
  let ratios = { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 };

  // Apply last month overspend cap for "Other"
  const lastMonthRatio = lastMonthOther / incomeNum;
  if (lastMonthRatio > 0.10) {
    let cap = 0.05; // default
    if (lastMonthRatio <= 0.15) cap = 0.08;
    else if (lastMonthRatio <= 0.20) cap = 0.06;

    const delta = ratios.other - cap;
    if (delta > 0) {
      ratios.other = cap;
      ratios.savings += delta * 0.7;
      ratios.essentials += delta * 0.3;
    }
  }

  // Compute allocations based on **full net income**
  let essentialsAmt = round2(ratios.essentials * incomeNum);
  let savingsAmt = round2(ratios.savings * incomeNum);
  let insuranceAmt = round2(ratios.insurance * incomeNum);
  let otherAmt = round2(ratios.other * incomeNum);

  // Adjust rounding drift to ensure total = net income
  const totalAlloc = essentialsAmt + savingsAmt + insuranceAmt + otherAmt;
  const drift = round2(incomeNum - totalAlloc);
  essentialsAmt += drift;

  const breakdown = [
    { name: "Essentials", amount: essentialsAmt },
    { name: "Savings", amount: savingsAmt },
    { name: "Insurance", amount: insuranceAmt },
    { name: "Other", amount: otherAmt }
  ];

  return {
    income: incomeNum,
    currency: "RM",
    breakdown: breakdown.map((row, i) => ({ ...row, color: pickColors(4)[i] })),
    savingsGoals: goals.map(g => ({
      id: g.id,
      name: g.name,
      current: Number(g.current || 0),
      target: Number(g.target || 0),
      deadline: g.deadline,
    })),
    expenses: expenses.map(e => ({ name: e.name, amount: Number(e.amount || 0) })),
    _lastMonthOther: lastMonthOther,
    _lastMonthOtherRatio: lastMonthRatio,
    _commitmentsTotal: commitTotal
  };
}

/* ===== Helpers ===== */
function round2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
