// server/services/budgetService.js
import axios from "axios";
import {
  getLatestIncome,
  getMonthlyCommitments,
  getRecentExpenses,
  getSavingsGoals,
  getOtherSpendThisMonth,
  getOtherSpendLastMonth,
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
      (process.env.BUDGET_AI_API + "/api/segment") || "http://localhost:5002/api/segment",
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
      repayment_plan: data?.repayment_plan ?? null
    };
  } catch (err) {
    console.error("AI offline, using fallback:", err?.message || err);
  }


  // --- Allocation and rules (Banded allocator) ---
  // fetch last month's other (needs repository function)
  const lastMonthOther = round2(Number(await getOtherSpendLastMonth(userId) || 0));
  const lastMonthOtherRatio = incomeNum > 0 ? lastMonthOther / incomeNum : 0;

  const baseResult = allocateBudgetBanded(
    incomeNum,
    commitmentsTotal,
    safeRatios(aiAdvice.ratios),
  );

  // First: if AI suggests a repayment_plan from its model, apply the monthly repayment to baseResult
  if (aiAdvice.repayment_plan && aiAdvice.repayment_plan.monthly_amount) {
    const monthlyRepayAmt = Number(aiAdvice.repayment_plan.monthly_amount || 0);
    // reduce savings first
    let out = { ...baseResult };
    const savingsAvail = Number(out.savings || 0);
    const takeFromSavings = Math.min(savingsAvail, monthlyRepayAmt);
    out.savings = round2(savingsAvail - takeFromSavings);

    let remaining = round2(monthlyRepayAmt - takeFromSavings);
    if (remaining > 0) {
      // pull from essentials but preserve commitments
      const essentialsAvail = Math.max(0, Number(out.essentials || 0) - Number(commitmentsTotal || 0));
      const takeFromEss = Math.min(essentialsAvail, remaining);
      out.essentials = round2(Number(out.essentials || 0) - takeFromEss);
      remaining = round2(remaining - takeFromEss);
    }
    if (remaining > 0) {
      const takeFromIns = Math.min(Number(out.insBucket || 0), remaining);
      out.insBucket = round2(Number(out.insBucket || 0) - takeFromIns);
      remaining = round2(remaining - takeFromIns);
    }

    out._repayment_applied = {
      monthly_amount: monthlyRepayAmt,
      months: aiAdvice.repayment_plan.months,
      remaining_unfunded: remaining
    };

    // use adjusted baseResult for final caps
    Object.assign(baseResult, out);
  }

  // Then: apply local recovery logic using last month observed other (preferred)
  const interimResult = hardCapOtherWithRecovery(
    baseResult,
    incomeNum,
    otherRatio,
    lastMonthOther,
    3,
    aiAdvice?.label || aiAdvice?.segment
  );

  // --- NEW: enforce cap this month if lastMonthOtherRatio > 10%
  // We compute a cap based on lastMonthOtherRatio and force this month's Other down to that cap now,
  // redistributing delta into savings (preferred) and essentials (fallback).
  let finalResult = { ...interimResult };

  const capRatioFromBand = capOtherByBandJS(lastMonthOtherRatio); // may be null
  if (capRatioFromBand != null && capRatioFromBand > 0) {
    const capAmt = round2(capRatioFromBand * incomeNum);

    if (finalResult.other > capAmt) {
      const prevOther = finalResult.other;
      const deltaNow = round2(prevOther - capAmt);

      // Prefer to move delta into savings, then essentials
      let addToSavings = round2(deltaNow * 0.7); // 70%
      let addToEss = round2(deltaNow * 0.3); // 30%

      // If savings exist, add; otherwise try to put more into essentials
      finalResult.other = capAmt;

      finalResult.savings = round2(Math.max(0, (finalResult.savings || 0) + addToSavings));
      finalResult.essentials = round2(Math.max(0, (finalResult.essentials || 0) + addToEss));

      // If after adding, we exceed income due to rounding, fix drift by adjusting savings
      const sum = finalResult.essentials + finalResult.savings + finalResult.insBucket + finalResult.other;
      const drift = round2(incomeNum - sum);
      if (drift !== 0) finalResult.savings = round2(Math.max(0, finalResult.savings + drift));

      // annotate recovery plan
      finalResult._recoveryPlan = finalResult._recoveryPlan || {};
      finalResult._recoveryPlan.enforced_immediate = true;
      finalResult._recoveryPlan.capRatioThisMonth = capRatioFromBand;
      finalResult._recoveryPlan.capAmtThisMonth = capAmt;
      finalResult._recoveryPlan.deltaNow = deltaNow;
      finalResult._recoveryPlan.note = `Because last month Other was ${Math.round(lastMonthOther)} (${Math.round(lastMonthOtherRatio*1000)/10}%), we capped Other to ${capRatioFromBand*100}% this month (RM ${capAmt}).`;
    }
  }

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

  return {
    income: incomeNum,
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    ai: { source: aiAdvice.source, segment: aiAdvice.label, repayment_plan: aiAdvice.repayment_plan },
    _repayment_applied: baseResult._repayment_applied || null,
    _recoveryPlan: finalResult._recoveryPlan || null,
  };

}

/* =========================
   Banded allocator (NO negatives, sums to income)
   ========================= */
function allocateBudgetBanded(income, commitmentsTotal, ratios) {
  income = Number(income) || 0;
  commitmentsTotal = Math.max(0, Number(commitmentsTotal) || 0);

  const r = Math.max(0, income) === 0 ? 0 : Math.max(0, income - commitmentsTotal) / income; // room ratio
  const room = Math.max(0, income - commitmentsTotal);

  const pct = (x) => round2((Number(x) || 0) * income);
  const nonneg = (x) => Math.max(0, round2(x));

  // Helper to finalize so that:
  // 1) all buckets are non-negative
  // 2) Essentials = income - (others), clamped ≥ commitmentsTotal
  // 3) sum equals income exactly (drift correction absorbed into Savings)
  const finalize = (ess, sav, ins, oth, status) => {
    let savings = nonneg(sav);
    let insBucket = nonneg(ins);
    let other = nonneg(oth);

    // Essentials must be at least commitments, but cannot exceed income
    let essentials = round2(income - (savings + insBucket + other));
    if (essentials < commitmentsTotal) {
      const deficit = round2(commitmentsTotal - essentials);

      // Pull from savings/other in order, then insurance if needed
      const pull = (amount, takeFrom) => {
        const can = Math.min(amount, takeFrom);
        return [round2(amount - can), round2(takeFrom - can)];
      };
      let need = deficit;
      [need, savings] = pull(need, savings);
      [need, other] = pull(need, other);
      [need, insBucket] = pull(need, insBucket);

      essentials = round2(essentials + deficit - need);
      // If still need > 0 (shouldn't happen), cap essentials at income.
      essentials = Math.min(essentials, income);
      // Recompute drift to match income exactly
      const sum = essentials + savings + insBucket + other;
      const drift = round2(income - sum);
      if (drift > 0) savings = round2(savings + drift);
    }

    // Final clamp and sum-fix
    essentials = nonneg(essentials);
    const sum = essentials + savings + insBucket + other;
    const drift = round2(income - sum);
    if (drift !== 0) {
      // prefer to adjust savings
      savings = nonneg(savings + drift);
      // if still off due to rounding, adjust essentials minimally
      const sum2 = essentials + savings + insBucket + other;
      const drift2 = round2(income - sum2);
      if (drift2 !== 0) essentials = nonneg(essentials + drift2);
    }

    return { essentials, savings, insBucket, other, _status: status };
  };

  // Bands
  if (room <= 0) {
    // Emergency: commitments meet/exceed income
    return finalize(income, 0, 0, 0, "emergency");
  }

  if (r <= 0.05) {
    // Survival
    const insFloor = Math.min(room, pct(0.03)); // 3% if possible
    const savFloor = Math.min(room - insFloor, pct(0.05)); // up to 5%
    const oth = 0;
    return finalize(commitmentsTotal, savFloor, insFloor, oth, "survival");
  }

  if (r <= 0.15) {
    // Tight
    const insFloor = Math.min(room, pct(0.05)); // 5%
    const savFloor = Math.min(Math.max(room - insFloor, 0), pct(0.10)); // 10% but cap by room
    const othCap = pct(0.02); // 2%
    const oth = Math.min(othCap, Math.max(room - insFloor - savFloor, 0));
    // any remainder goes to savings
    const used = insFloor + savFloor + oth;
    const extraToSavings = Math.max(room - used, 0);
    return finalize(commitmentsTotal, savFloor + extraToSavings, insFloor, oth, "tight");
  }

  if (r <= 0.30) {
    // Constrained
    const insFloor = Math.min(room, pct(0.05)); // 5%
    const savFloor = Math.min(Math.max(room - insFloor, 0), pct(0.15)); // 15% floor (cap by room)
    const othCap = pct(0.05); // 5% cap

    // Try to use AI/fallback ratios for the remaining room after floors
    const rem = Math.max(room - (insFloor + savFloor), 0);
    const rOther = (ratios?.other ?? 0.10); // default 10% share if missing
    let othBase = round2(rem * rOther);
    let oth = Math.min(othCap, othBase);
    let rem2 = Math.max(rem - oth, 0);

    // Put remainder to savings
    const sav = round2(savFloor + rem2);
    return finalize(commitmentsTotal, sav, insFloor, oth, "constrained");
  }

  // Normal (>30%)
  {
    // Start from AI/fallback ratios
    const rE = ratios?.essentials ?? 0.55;
    const rS = ratios?.savings ?? 0.25;
    const rI = ratios?.insurance ?? 0.10;
    const rO = ratios?.other ?? 0.10;

    // Proposed non-essential allocations by ratios over the free room
    // But keep essentials at least commitments.
    let essentials = Math.max(commitmentsTotal, round2(rE * income));
    if (essentials > income) essentials = income; // just in case

    const free = Math.max(0, income - essentials);

    // initial split of free by ratios (normalized)
    const wSum = Math.max(rS + rI + rO, 1e-9);
    let savings = round2(free * (rS / wSum));
    let insBucket = round2(free * (rI / wSum));
    let other = round2(free * (rO / wSum));

    // insurance guard [5%, 15%]
    const minI = pct(0.05), maxI = pct(0.15);
    insBucket = clamp(insBucket, Math.min(minI, free), Math.min(maxI, free));
    // savings guard >= 20% income (if possible)
    const minS = pct(0.20);
    const flexAfterI = Math.max(0, income - essentials - insBucket);
    savings = Math.min(Math.max(savings, Math.min(minS, flexAfterI)), flexAfterI);
    // other is the remainder
    other = Math.max(0, round2(income - (essentials + savings + insBucket)));

    return finalize(essentials, savings, insBucket, other, "normal");
  }
}

/* =========================
   SIMPLE after-allocation hard cap
   ========================= */
// If Other > 10% this month, FORCE "Other" amount to 6% of income.
// Push the cut to Savings (70%) and Essentials (30%).
function hardCapOther(finals, income, otherRatio, label = "balanced spender") {
  if (!income || otherRatio <= 0.10) return finals; // only act if >10%

  const capRatio = 0.06;                 // visible & simple
  const capAmt = round2(capRatio * income);

  if (finals.other <= capAmt) return finals; // already at/under cap

  const delta = round2(finals.other - capAmt);

  // segment-aware split (optional)
  let wS = 0.70, wE = 0.30;
  const key = String(label || "").toLowerCase();
  if (key.includes("conservative")) { wS = 0.80; wE = 0.20; }
  else if (key.includes("over")) { wS = 0.90; wE = 0.10; }

  const addS = round2(delta * wS);
  const addE = round2(delta * wE);

  const out = { ...finals };
  out.other = capAmt;
  out.savings = round2(out.savings + addS);
  out.essentials = round2(out.essentials + addE);

  // keep insurance unchanged; fix rounding drift to match income exactly
  const sum = out.essentials + out.savings + out.insBucket + out.other;
  const drift = round2(income - sum);
  out.savings = round2(out.savings + drift);

  return out;
}

// New: hardCapOtherWithRecovery - keeps this month's observed Other but plans recovery next months
function hardCapOtherWithRecovery(finals, income, otherRatio, lastMonthOtherAmount = 0, recoveryMonths = 3, label = "balanced spender") {
  if (!income || otherRatio <= 0.10) return finals;

  const capRatio = 0.06;                 // visible & simple target
  const capAmt = round2(capRatio * income);

  const lastOther = round2(Number(lastMonthOtherAmount || 0));
  const excess = Math.max(0, round2(lastOther - capAmt));

  // If no observable excess, fallback to immediate cap behavior
  if (excess <= 0) {
    return hardCapOther(finals, income, otherRatio, label);
  }

  const recoveryShare = round2(excess / Math.max(1, recoveryMonths));
  const out = { ...finals };

  // Ensure UI reflects reality for this month: keep other at least lastMonth observed
  out.other = Math.min(Math.max(out.other, lastOther), income);

  // Deduct recoveryShare from savings first
  const availableSavings = Math.max(0, out.savings);
  if (availableSavings >= recoveryShare) {
    out.savings = round2(availableSavings - recoveryShare);
  } else {
    // partial from savings, then from 'other' down to capAmt, then essentials
    const need = round2(recoveryShare - availableSavings);
    out.savings = 0;
    const reducibleOther = Math.max(0, out.other - capAmt);
    const takeFromOther = Math.min(reducibleOther, need);
    out.other = round2(out.other - takeFromOther);
    let remaining = round2(need - takeFromOther);
    if (remaining > 0) {
      // last resort: pull from essentials (but not below commitments)
      out.essentials = round2(Math.max(0, out.essentials - remaining));
      remaining = 0;
    }
  }

  // Fix rounding drift so sum == income (prefer adjusting savings)
  const sum = out.essentials + out.savings + out.insBucket + out.other;
  const drift = round2(income - sum);
  if (drift !== 0) out.savings = round2(Math.max(0, out.savings + drift));

  // attach a plan so UI can show it
  out._recoveryPlan = {
    capRatio,
    capAmt,
    lastOther,
    excess,
    recoveryMonths,
    recoveryShare,
    note: `Recover ${excess} over ${recoveryMonths} months by reducing savings first.`
  };

  return out;
}

/* =========================
   Helpers for immediate enforcement
   ========================= */
// Compute cap ratio from a last-month other ratio (mirrors Python cap_other_by_band)
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
    None: { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Frugal: { essentials: 0.50, savings: 0.30, insurance: 0.10, other: 0.10 },
    Balanced: { essentials: 0.55, savings: 0.25, insurance: 0.10, other: 0.10 },
    Luxury: { essentials: 0.60, savings: 0.20, insurance: 0.10, other: 0.10 },
  };
  return { label: "fallback", ratios: table[lifestyle] || table.None, source: "fallback" };
}
