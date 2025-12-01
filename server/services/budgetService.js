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

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

export async function buildDashboardData(userId) {
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;

  const income = Number(incomeRow.net_income || 0);
  const lastMonthOther = Number(await getOtherSpendLastMonth(userId) || 0);
  const commitments = await getMonthlyCommitments(userId) || [];
  const expenses = await getRecentExpenses(userId) || [];
  const goals = await getSavingsGoals(userId) || [];

  // Step 1: fallback ratios
  let ratios = { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 };

  // Step 2: cap Other if last month >10%
  const lastMonthRatio = income > 0 ? lastMonthOther / income : 0;
  if (lastMonthRatio > 0.10) {
    let cap = 0.08;
    if (lastMonthRatio <= 0.15) cap = 0.08;
    else if (lastMonthRatio <= 0.2) cap = 0.06;
    else cap = 0.05;

    const delta = ratios.other - cap;
    if (delta > 0) {
      ratios.other = cap;
      ratios.savings += delta * 0.7;
      ratios.essentials += delta * 0.3;
    }
  }

  // Step 3: compute tentative amounts
  let essentialsAmt = round2(income * ratios.essentials);
  let savingsAmt = round2(income * ratios.savings);
  let insuranceAmt = round2(income * ratios.insurance);
  let otherAmt = round2(income * ratios.other);

  // Step 4: check if Essentials + Insurance + Other > income
  let fixedTotal = essentialsAmt + insuranceAmt + otherAmt;
  if (fixedTotal > income) {
    // Prioritize Essentials first
    essentialsAmt = Math.min(essentialsAmt, income);
    let remaining = Math.max(0, income - essentialsAmt);

    insuranceAmt = Math.min(insuranceAmt, remaining);
    remaining -= insuranceAmt;

    otherAmt = Math.min(otherAmt, remaining);
    remaining -= otherAmt;

    savingsAmt = remaining; // whatever is left goes to savings
  } else {
    // Adjust savings to absorb drift
    const totalAlloc = essentialsAmt + savingsAmt + insuranceAmt + otherAmt;
    const drift = round2(income - totalAlloc);
    savingsAmt += drift;
  }

  // Ensure non-negative
  essentialsAmt = Math.max(0, essentialsAmt);
  savingsAmt = Math.max(0, savingsAmt);
  insuranceAmt = Math.max(0, insuranceAmt);
  otherAmt = Math.max(0, otherAmt);

  const breakdown = [
    { name: "Essentials", amount: essentialsAmt },
    { name: "Savings", amount: savingsAmt },
    { name: "Insurance", amount: insuranceAmt },
    { name: "Other", amount: otherAmt }
  ].map((row, i) => ({ ...row, color: pickColors(4)[i] }));

  const savingsGoals = goals.map(g => ({
    id: g.id,
    name: g.name,
    current: Number(g.current || 0),
    target: Number(g.target || 0),
    deadline: g.deadline
  }));

  const expensesList = expenses.map(e => ({ name: e.name, amount: Number(e.amount || 0) }));

  return {
    income,
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    _lastMonthOther: lastMonthOther,
    _lastMonthOtherRatio: lastMonthRatio
  };
}
