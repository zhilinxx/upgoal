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
  const incomeRow = await getLatestIncome(userId);
  if (!incomeRow) return null;
  const { net_income: netIncome, lifestyle } = incomeRow;
  const incomeNum = Number(netIncome) || 0;

  const otherThisMonth = await getOtherSpendThisMonth(userId);
  const otherRatio = incomeNum > 0 ? otherThisMonth / incomeNum : 0;

  const commitments = await getMonthlyCommitments(userId);
  const expenses = await getRecentExpenses(userId);
  const goals = await getSavingsGoals(userId);

  let housingLoan=0, carLoan=0, insurance=0, others=0;
  for (const r of commitments) {
    const t=(r.type||"").toLowerCase(); const amt=Number(r.amount||0);
    if(t.includes("house")||t.includes("mortgage")||t.includes("rent")) housingLoan+=amt;
    else if(t.includes("car")||t.includes("vehicle")||t.includes("auto")) carLoan+=amt;
    else if(t.includes("insurance")) insurance+=amt;
    else others+=amt;
  }
  const commitmentsTotal = housingLoan + carLoan + insurance + others;

  let aiAdvice = { label:"fallback", ratios:null, source:"fallback" };
  try {
    const { data } = await axios.post(
      (process.env.BUDGET_AI_API+"/api/segment")||"http://localhost:5002/api/segment",
      { income: incomeNum, commitments:{housingLoan,carLoan,insurance,others}, lifestyle,
        other_spend_amount:otherThisMonth, other_spend_ratio:otherRatio,
        overspend_flags:{other_gt_10: otherRatio>0.10} },
      { timeout: 2000 }
    );
    aiAdvice = { label:data?.label??"ai", ratios:data?.ratios??null, source:data?.source??"ai", repayment_plan:data?.repayment_plan??null };
  } catch(err){ console.error("AI offline:", err?.message||err); }

  const lastMonthOther = round2(Number(await getOtherSpendLastMonth(userId)||0));
  const lastMonthOtherRatio = incomeNum>0 ? lastMonthOther/incomeNum:0;

  const baseResult = allocateBudgetBanded(
    incomeNum,
    commitmentsTotal,
    safeRatios(aiAdvice.ratios)
  );

  if(aiAdvice.repayment_plan?.monthly_amount){
    const monthlyRepayAmt = Number(aiAdvice.repayment_plan.monthly_amount||0);
    let out = {...baseResult};
    const savingsAvail = Number(out.savings||0);
    const takeFromSavings = Math.min(savingsAvail, monthlyRepayAmt);
    out.savings = round2(savingsAvail - takeFromSavings);
    let remaining = round2(monthlyRepayAmt - takeFromSavings);
    if(remaining>0){
      const essentialsAvail = Math.max(0, Number(out.essentials||0)-Number(commitmentsTotal||0));
      const takeFromEss = Math.min(essentialsAvail, remaining);
      out.essentials = round2(Number(out.essentials||0)-takeFromEss);
      remaining = round2(remaining - takeFromEss);
    }
    if(remaining>0){
      const takeFromIns = Math.min(Number(out.insBucket||0), remaining);
      out.insBucket = round2(Number(out.insBucket||0)-takeFromIns);
      remaining = round2(remaining - takeFromIns);
    }
    out._repayment_applied={ monthly_amount:monthlyRepayAmt, months:aiAdvice.repayment_plan.months, remaining_unfunded:remaining };
    Object.assign(baseResult,out);
  }

  const interimResult = hardCapOtherWithRecovery(baseResult,incomeNum,otherRatio,lastMonthOther,3,aiAdvice?.label||aiAdvice?.segment);

  let finalResult = {...interimResult};
  const capRatioFromBand = capOtherByBandJS(lastMonthOtherRatio);
  if(capRatioFromBand!=null && capRatioFromBand>0){
    const capAmt = round2(capRatioFromBand*incomeNum);
    if(finalResult.other>capAmt){
      const prevOther=finalResult.other;
      const deltaNow = round2(prevOther - capAmt);
      let addToSavings = round2(deltaNow*0.7);
      let addToEss = round2(deltaNow*0.3);
      finalResult.other = capAmt;
      finalResult.savings = round2(Math.max(0,(finalResult.savings||0)+addToSavings));
      finalResult.essentials = round2(Math.max(0,(finalResult.essentials||0)+addToEss));
      const sum = finalResult.essentials+finalResult.savings+finalResult.insBucket+finalResult.other;
      const drift = round2(incomeNum-sum);
      if(drift!==0) finalResult.savings = round2(Math.max(0,finalResult.savings+drift));
      finalResult._recoveryPlan = finalResult._recoveryPlan||{};
      finalResult._recoveryPlan.enforced_immediate = true;
      finalResult._recoveryPlan.capRatioThisMonth = capRatioFromBand;
      finalResult._recoveryPlan.capAmtThisMonth = capAmt;
      finalResult._recoveryPlan.deltaNow = deltaNow;
      finalResult._recoveryPlan.note = `Because last month Other was ${Math.round(lastMonthOther)} (${Math.round(lastMonthOtherRatio*1000)/10}%), we capped Other to ${capRatioFromBand*100}% this month (RM ${capAmt}).`;
    }
  }

  const breakdown = [
    { name:"Essentials", amount:finalResult.essentials },
    { name:"Savings", amount:finalResult.savings },
    { name:"Insurance", amount:finalResult.insBucket },
    { name:"Other", amount:finalResult.other }
  ].map((row,i)=>({...row,color:pickColors(4)[i]}));

  const savingsGoals = goals.map(g=>({ id:g.id, name:g.name, current:Number(g.current||0), target:Number(g.target||0), deadline:g.deadline }));
  const expensesList = expenses.map(e=>({ name:e.name, amount:Number(e.amount||0) }));

  return {
    income: incomeNum,
    currency: "RM",
    breakdown,
    savingsGoals,
    expenses: expensesList,
    ai: { source: aiAdvice.source, segment: aiAdvice.label, repayment_plan: aiAdvice.repayment_plan },
    _repayment_applied: baseResult._repayment_applied||null,
    _recoveryPlan: finalResult._recoveryPlan||null
  };
}

/* =========================
   Helpers
========================= */
function round2(n){ return Math.round((Number(n)||0)*100)/100; }
function clamp(v,lo,hi){ return Math.min(Math.max(v,lo),hi); }
function safeRatios(r){
  const keys=["essentials","savings","insurance","other"];
  if(!r||typeof r!=="object") return null;
  const ok=keys.every(k=>typeof r[k]==="number"&&r[k]>=0);
  if(!ok) return null;
  const sum=keys.reduce((acc,k)=>acc+r[k],0);
  if(sum<=0) return null;
  return keys.reduce((acc,k)=>(acc[k]=r[k]/sum,acc),{});
}
function capOtherByBandJS(otherRatio){
  if(otherRatio==null) return null;
  const r=Number(otherRatio);
  if(Number.isNaN(r)) return null;
  if(r<=0.10) return null;
  if(r<=0.15) return 0.08;
  if(r<=0.20) return 0.06;
  return 0.05;
}
