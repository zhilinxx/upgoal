// server/services/budgetService.js
import axios from "axios";
import {
  getLatestIncome,
  getMonthlyCommitments,
  getRecentExpenses,
  getSavingsGoals,
  getOtherSpendThisMonth,
} from "../repositories/budgetRepository.js";

const COLORS = ["#ff7b8c", "#f8a9a8", "#ffb9b6", "#c4e0b5", "#b3d4ff", "#ffd27f"];
const pickColors = (n) => Array.from({ length: n }, (_, i) => COLORS[i % COLORS.length]);

export async function buildDashboardData(userId) {
  // --- Fetch from repository layer ---
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;

  const { net_income: netIncome, lifestyle } = incomeRow;
  const incomeNum = Number(netIncome) || 0;

  // --- Check "Other" spending ratio (this month) ---
  const otherThisMonth = await getOtherSpendThisMonth(userId);
  const otherRatio = incomeNum > 0 ? otherThisMonth / incomeNum : 0;

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
  let aiAdvice = { label: "fallback", ratios: null, source: "fallback" };
  try {
    const { data } = await axios.post(
      process.env.AI_BUDGET_URL || "http://localhost:5002/api/segment",
      {
        income: incomeNum,
        commitments: { housingLoan, carLoan, insurance, others },
        lifestyle,
        other_spend_amount: otherThisMonth,
        other_spend_ratio: otherRatio,
        overspend_flags: { other_gt_10: otherRatio > 0.10 },
      },
      { timeout: 2000 }
    );
    aiAdvice = {
      label: data?.label ?? "ai",
      ratios: data?.ratios ?? null,
      source: data?.source ?? "ai",
    };
  } catch (err) {
    console.error("AI offline, using fallback:", err?.message || err);
  }

  // --- Allocation with band rules (pre-cap) ---
  const preCap = allocateWithBands(incomeNum, commitmentsTotal, safeRatios(aiAdvice.ratios));

  // ✅ SIMPLE, VISIBLE RULE: if Other > 10% this month, force Other = 6% of income
  const finalResult = hardCapOther(preCap, incomeNum, otherRatio, aiAdvice?.label || aiAdvice?.segment);

  // --- Prepare final structure ---
  const breakdown = [
    { name: "Essentials", amount: finalResult.essentials },
    { name: "Savings", amount: finalResult.savings },
    { name: "Insurance", amount: finalResult.insBucket },
    { name: "Other", amount: finalResult.other },
  ].map((row, i) => ({ ...row, color: pickColors(4)[i] }));

  const savingsGoals = goals.map((g) => ({
    id: g.id,
    name: g.name,
    current: Number(g.current || 0),
    target: Number(g.target || 0),
    deadline: g.deadline,
  }));

  const expensesList = expenses.map((e) => ({ name: e.name, amount: Number(e.amount || 0) }));
  console.log("[breakdown]", breakdown);

  return {
    income: incomeNum,
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    ai: { source: aiAdvice.source, segment: aiAdvice.label },
    // debug: { otherThisMonth, otherRatio, preCap, finalResult }, // optional
  };
}

/* =========================
   Band-based allocation
   ========================= */
function allocateWithBands(income, commitmentsTotal, ratios) {
  // Guards
  if (!Number.isFinite(income) || income <= 0) {
    return { essentials: 0, savings: 0, insBucket: 0, other: 0 };
  }
  const commit = Math.max(0, Number(commitmentsTotal) || 0);
  const room = Math.max(0, income - commit);
  const r = income > 0 ? room / income : 0;

  // helpers
  const pct = (p) => round2(p * income);

  // Outputs we’ll fill
  let essentials = commit; // essentials at least equals commitments
  let savings = 0;
  let insBucket = 0;
  let other = 0;

  // ------- Bands -------
  if (r <= 0) {
    // Emergency mode
    essentials = commit;
    savings = 0;
    insBucket = 0;
    other = 0;

    return finalizeBuckets(income, essentials, insBucket, savings, other);
  }

  if (r <= 0.05) {
    // Survival mode
    // Insurance floor 3% (if room allows)
    insBucket = Math.min(pct(0.03), room);
    const room1 = Math.max(0, room - insBucket);

    // Savings floor up to 5% but cannot exceed remaining room
    savings = Math.min(pct(0.05), room1);

    // Other = 0 in survival
    other = 0;

    // Essentials take the rest
    essentials = income - insBucket - savings - other;

    return finalizeBuckets(income, essentials, insBucket, savings, other);
  }

  if (r <= 0.15) {
    // Tight mode
    // Insurance floor 5%
    insBucket = Math.min(pct(0.05), room);
    let room1 = Math.max(0, room - insBucket);

    // Savings floor 10%
    savings = Math.min(pct(0.10), room1);
    let room2 = Math.max(0, room1 - savings);

    // Other cap at 2%
    const otherCap = pct(0.02);
    other = Math.min(otherCap, room2);

    // Any remainder goes to Savings
    const rem = Math.max(0, room2 - other);
    savings += rem;

    essentials = income - insBucket - savings - other;

    return finalizeBuckets(income, essentials, insBucket, savings, other);
  }

  if (r <= 0.30) {
    // Constrained mode
    // Insurance floor 5%
    insBucket = Math.min(pct(0.05), room);
    let room1 = Math.max(0, room - insBucket);

    // Savings floor 15%
    savings = Math.min(pct(0.15), room1);
    let room2 = Math.max(0, room1 - savings);

    // Other cap 5%
    const otherCap = pct(0.05);
    other = Math.min(otherCap, room2);
    let room3 = Math.max(0, room2 - other);

    // If still room, distribute per AI ratios between S and O (keep Insurance fixed)
    // Use only S and O weights from ratios
    const wS = Math.max(0, ratios?.savings ?? 0.25);
    const wO = Math.max(0, ratios?.other ?? 0.10);
    const wSum = wS + wO || 1;

    // Target adds
    let addS = (room3 * wS) / wSum;
    let addO = room3 - addS;

    // Respect Other cap strictly
    const allowedO = Math.max(0, otherCap - other);
    if (addO > allowedO) {
      const spill = addO - allowedO;
      addO = allowedO;
      addS += spill; // push excess into savings
    }

    savings += addS;
    other += addO;

    essentials = income - insBucket - savings - other;

    return finalizeBuckets(income, essentials, insBucket, savings, other);
  }

  // Normal mode (r > 30%): use AI/fallback ratios with classic guards
  return allocateNormal(income, commit, ratios);
}

/* =========================
   Normal-mode allocator (classic with guards)
   ========================= */
function allocateNormal(income, commitmentsTotal, r) {
  const ratios = r || { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 };

  // Essentials baseline is the larger of commitments vs ratio*income
  let essentials = Math.max(commitmentsTotal, ratios.essentials * income);
  let remaining = Math.max(0, income - essentials);

  const wSum = (ratios.savings || 0) + (ratios.insurance || 0) + (ratios.other || 0) || 1;
  let savings = (remaining * (ratios.savings || 0)) / wSum;
  let insBucket = (remaining * (ratios.insurance || 0)) / wSum;
  let other = (remaining * (ratios.other || 0)) / wSum;

  // Guards
  const minSavings = 0.20 * income;
  const maxInsurance = 0.15 * income;
  const minInsurance = 0.05 * income;

  insBucket = clamp(insBucket, minInsurance, maxInsurance);

  const flex = income - essentials - insBucket;
  savings = Math.min(Math.max(savings, minSavings), Math.max(flex, 0));
  other = Math.max(income - essentials - insBucket - savings, 0);

  return finalizeBuckets(income, essentials, insBucket, savings, other);
}

/* =========================
   Finalization: rounding + drift + safety clamps
   ========================= */
function finalizeBuckets(income, essentials, insBucket, savings, other) {
  // Round
  essentials = round2(essentials);
  insBucket  = round2(insBucket);
  savings    = round2(savings);
  other      = round2(other);

  // No negatives
  essentials = Math.max(0, essentials);
  insBucket  = Math.max(0, insBucket);
  savings    = Math.max(0, savings);
  other      = Math.max(0, other);

  // Fix total drift
  let sum = essentials + insBucket + savings + other;
  let diff = round2(income - sum);

  // Prefer to adjust Savings, then Other, finally Essentials (never below commitments baseline)
  if (diff !== 0) {
    // Try Savings first
    let adjust = Math.min(Math.max(savings + diff, 0) - savings, diff);
    savings = round2(savings + adjust);
    diff = round2(income - (essentials + insBucket + savings + other));
  }
  if (diff !== 0) {
    // Then Other
    let adjust = Math.min(Math.max(other + diff, 0) - other, diff);
    other = round2(other + adjust);
    diff = round2(income - (essentials + insBucket + savings + other));
  }
  if (diff !== 0) {
    // Finally Essentials (as last resort)
    essentials = round2(Math.max(0, essentials + diff));
    diff = round2(income - (essentials + insBucket + savings + other));
  }

  // One last safety clamp
  if (diff !== 0) {
    // push tiny residuals (±0.01/0.02) into Savings
    savings = round2(Math.max(0, savings + diff));
  }

  return { essentials, savings, insBucket, other };
}

/* =========================
   SIMPLE after-allocation hard cap
   ========================= */
// If Other > 10% this month, FORCE "Other" amount to 6% of income.
// Push the cut to Savings (70%) and Essentials (30%).
function hardCapOther(finals, income, otherRatio, label = "balanced spender") {
  if (!income || otherRatio <= 0.10) return finals; // only act if >10%

  const capRatio = 0.06;
  const capAmt   = round2(capRatio * income);

  if (finals.other <= capAmt) return finalizeBuckets(income, finals.essentials, finals.insBucket, finals.savings, finals.other);

  const delta = round2(finals.other - capAmt);

  // segment-aware split (optional)
  let wS = 0.70, wE = 0.30;
  const key = String(label || "").toLowerCase();
  if (key.includes("conservative")) { wS = 0.80; wE = 0.20; }
  else if (key.includes("over"))    { wS = 0.90; wE = 0.10; }

  const addS = round2(delta * wS);
  const addE = round2(delta * wE);

  const out = { ...finals };
  out.other      = capAmt;
  out.savings    = round2(out.savings + addS);
  out.essentials = round2(out.essentials + addE);

  return finalizeBuckets(income, out.essentials, out.insBucket, out.savings, out.other);
}

/* =========================
   Utils
   ========================= */
function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

function safeRatios(r) {
  const keys = ["essentials", "savings", "insurance", "other"];
  if (!r || typeof r !== "object") return null;
  const ok = keys.every((k) => typeof r[k] === "number" && r[k] >= 0);
  if (!ok) return null;
  const sum = keys.reduce((acc, k) => acc + r[k], 0);
  if (sum <= 0) return null;
  // normalize to be safe
  return keys.reduce((acc, k) => ((acc[k] = r[k] / sum), acc), {});
}

/* =========================
   Fallback ratios
   ========================= */
function fallbackRatios(lifestyle) {
  const table = {
    None:     { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Frugal:   { essentials: 0.50, savings: 0.30, insurance: 0.10, other: 0.10 },
    Balanced: { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Luxury:   { essentials: 0.60, savings: 0.20, insurance: 0.10, other: 0.10 },
  };
  return { label: "fallback", ratios: table[lifestyle] || table.None, source: "fallback" };
}
