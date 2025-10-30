import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchDashboardData, postAlerts, postAdjustBudgets } from "../api/budgetAPI.js";

// existing sections
import BudgetSummary from "../components/BudgetSummary.jsx";
import SavingsGoals from "../components/SavingsGoals.jsx";
import ExpensesList from "../components/Expenses.jsx";
import RuleControls from "../components/RuleControls.jsx";

import "../styles/BudgetPlanner.css";

export default function BudgetPlanner() {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [plan, setPlan] = useState(null);          // { Essentials, Savings, Insurance, Other }
  const [spending, setSpending] = useState(null);  // same keys as plan
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const d = await fetchDashboardData();
        if (!mounted) return;
        setData(d);

        // convert breakdown to map
        const p = {};
        (d?.breakdown ?? []).forEach(b => (p[b.name] = Number(b.amount || 0)));
        setPlan(p);

        // default spending by bucket (user can key in)
        setSpending({
          Essentials: 0, Savings: 0, Insurance: 0, Other: 0,
        });
      } catch (err) {
        console.error("Error fetching budget data:", err);
        setData(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const income = data?.income ?? 0;
  const currency = data?.currency ?? "RM";
  const aiSegment = data?.ai?.segment ?? "fallback";

  const planTotal = useMemo(
    () => Object.values(plan ?? {}).reduce((s, v) => s + Number(v || 0), 0),
    [plan]
  );

  // --- rules: alerts
  const handleCheckAlerts = async (limits) => {
    try {
      const { data: res } = await postAlerts({
        income,
        limits,
        spending: spending ?? {},
      });
      setAlerts(res.alerts || []);
    } catch (e) {
      console.error(e);
    }
  };

  // --- rules: auto-reallocate
  const handleAutoAdjust = async () => {
    try {
      const { data: res } = await postAdjustBudgets({ plan, spending: spending ?? {} });
      setPlan(res.adjusted);
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return <div className="budget-planner-loading">Loading Budget Planner…</div>;
  }

  if (!data) {
    return (
      <div className="budget-planner-error">
        <p>You haven’t completed your income setup yet.</p>
        <button className="setup-btn" onClick={() => navigate("/incomeSetup")}>
          Go to Setup
        </button>
      </div>
    );
  }

  return (
    <div className="budget-page-container">
      {/* Header (kept like your Insurance pages) */}
      <div className="budget-header">
        <h2>Budget Planner</h2>
        <div className={`ai-chip ${aiSegment.replace(/\s+/g, "-").toLowerCase()}`}>
          AI Segment: <b>{aiSegment}</b>
        </div>
      </div>

      {/* 3-card grid */}
      <div className="budget-grid">
        {/* Card 1: Doughnut + RuleControls */}
        <section className="budget-card">
          <BudgetSummary income={income} breakdown={data.breakdown} currency={currency} />
          {/* <RuleControls
            currency={currency}
            income={income}
            plan={plan}
            spending={spending}
            setSpending={setSpending}
            alerts={alerts}
            onCheckAlerts={handleCheckAlerts}
            onAutoAdjust={handleAutoAdjust}
          /> */}
        </section>

        {/* Card 2: Savings Goals */}
        <section className="budget-card">
          <SavingsGoals goals={data.savingsGoals} currency={currency} />
        </section>

        {/* Card 3: Expenses (full width) */}
        <section className="budget-card budget-card--full">
          <ExpensesList expenses={data.expenses} currency={currency} />
        </section>
      </div>
    </div>
  );
}
