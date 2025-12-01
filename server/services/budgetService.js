// server/services/budgetService.js
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

/* ===== utils ===== */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}
function nonneg(v) {
  return Math.max(0, round2(v));
}
function capOtherByBandJS(otherRatio) {
  if (otherRatio == null) return null;
  const r = Number(otherRatio);
  if (Number.isNaN(r)) return null;
  if (r <= 0.10) return null;
  if (r <= 0.15) return 0.08;
  if (r <= 0.20) return 0.06;
  return 0.05;
}

/* =========================
   Main exported function
   ========================= */
export async function buildDashboardData(userId) {
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;

  const income = Number(incomeRow.net_income || 0);
  const lastMonthOther = Number(await getOtherSpendLastMonth(userId) || 0);
  const otherThisMonth = Number(await getOtherSpendThisMonth(userId) || 0);

  const commitments = (await getMonthlyCommitments(userId)) || [];
  const expenses = (await getRecentExpenses(userId)) || [];
  const goals = (await getSavingsGoals(userId)) || [];

  // compute commitments total (sum of monthly_commitments.commitment_amt)
  let housingLoan = 0, carLoan = 0, insCommit = 0, othersCommit = 0;
  for (const r of commitments) {
    const t = (r.type || "").toLowerCase();
    const amt = Number(r.amount || 0);
    if (t.includes("house") || t.includes("mortgage") || t.includes("rent")) housingLoan += amt;
    else if (t.includes("car") || t.includes("vehicle") || t.includes("auto")) carLoan += amt;
    else if (t.includes("insurance")) insCommit += amt;
    else othersCommit += amt;
  }
  const commitmentsTotal = round2(housingLoan + carLoan + insCommit + othersCommit);

  // Step A: base ratios (fallback)
  let ratios = { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 };

  // Step B: if last month Other >10% of income, reduce this month's 'other' ratio and redistribute
  const lastMonthOtherRatio = income > 0 ? lastMonthOther / income : 0;
  const capRatio = capOtherByBandJS(lastMonthOtherRatio);
  if (capRatio != null) {
    const delta = ratios.other - capRatio;
    if (delta > 0) {
      ratios.other = capRatio;
      ratios.savings += delta * 0.7;
      ratios.essentials += delta * 0.3;
    }
  }

  // Step C: compute tentative allocations based on FULL income
  let essentialsAmt = round2(income * ratios.essentials);
  let savingsAmt = round2(income * ratios.savings);
  let insuranceAmt = round2(income * ratios.insurance);
  let otherAmt = round2(income * ratios.other);

  // Step D: enforce essentials >= commitmentsTotal (commitments are prioritized)
  // If commitments >= income -> emergency: essentials = income, others = savings = insurance = 0
  if (commitmentsTotal >= income) {
    essentialsAmt = round2(income);
    savingsAmt = 0;
    insuranceAmt = 0;
    otherAmt = 0;
  } else {
    // Ensure essentials covers commitments:
    if (essentialsAmt < commitmentsTotal) {
      let need = round2(commitmentsTotal - essentialsAmt);

      // Try reduce savings first
      const takeFromSavings = Math.min(savingsAmt, need);
      savingsAmt = round2(savingsAmt - takeFromSavings);
      need = round2(need - takeFromSavings);

      // Then try reduce 'other'
      const reducibleOther = Math.min(otherAmt, need);
      otherAmt = round2(otherAmt - reducibleOther);
      need = round2(need - reducibleOther);

      // Then try reduce insurance
      const takeFromInsurance = Math.min(insuranceAmt, need);
      insuranceAmt = round2(insuranceAmt - takeFromInsurance);
      need = round2(need - takeFromInsurance);

      // After borrowing from other buckets, set essentials = commitmentsTotal (or compute by income - rest)
      if (need > 0) {
        // still short -> fallback to emergency-like: set essentials to income and zero others
        essentialsAmt = round2(income);
        savingsAmt = 0;
        insuranceAmt = 0;
        otherAmt = 0;
      } else {
        // compute essentials as income - (savings + insurance + other)
        essentialsAmt = round2(income - (savingsAmt + insuranceAmt + otherAmt));
        // final guard: ensure essentials is at least commitmentsTotal
        if (essentialsAmt < commitmentsTotal) {
          essentialsAmt = round2(commitmentsTotal);
          // recompute drift by taking from savings (if any) else set savings to 0 and adjust essentials accordingly
          const sumRest = round2(savingsAmt + insuranceAmt + otherAmt);
          const remaining = round2(income - essentialsAmt);
          if (remaining < 0) {
            // shouldn't happen but guard
            essentialsAmt = round2(income);
            savingsAmt = 0;
            insuranceAmt = 0;
            otherAmt = 0;
          } else {
            // distribute remaining into savings (preferred) then insurance/other proportionally (but keep simple: put to savings)
            savingsAmt = round2(Math.max(0, remaining));
            insuranceAmt = 0;
            otherAmt = 0;
          }
        }
      }
    } else {
      // essentials already >= commitments => absorb rounding drift into savings so total == income
      const totalAlloc = round2(essentialsAmt + savingsAmt + insuranceAmt + otherAmt);
      const drift = round2(income - totalAlloc);
      savingsAmt = round2(savingsAmt + drift);
    }
  }

  // Final safety clamps and final drift fix
  essentialsAmt = nonneg(essentialsAmt);
  savingsAmt = nonneg(savingsAmt);
  insuranceAmt = nonneg(insuranceAmt);
  otherAmt = nonneg(otherAmt);

  // Ensure sum == income (final drift correction to savings)
  const finalSum = round2(essentialsAmt + savingsAmt + insuranceAmt + otherAmt);
  const finalDrift = round2(income - finalSum);
  if (finalDrift !== 0) {
    savingsAmt = round2(Math.max(0, savingsAmt + finalDrift));
  }

  // If still not equal due to numeric edgecases, as last resort adjust essentials
  const finalSum2 = round2(essentialsAmt + savingsAmt + insuranceAmt + otherAmt);
  if (finalSum2 !== round2(income)) {
    essentialsAmt = round2(essentialsAmt + (round2(income) - finalSum2));
  }

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
    deadline: g.deadline,
  }));

  const expensesList = expenses.map(e => ({ name: e.name, amount: Number(e.amount || 0) }));

  return {
    income,
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    _commitmentsTotal: commitmentsTotal,
    _lastMonthOther: lastMonthOther,
    _lastMonthOtherRatio: lastMonthOtherRatio,
  };
}
