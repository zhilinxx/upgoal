import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// data fetch (same pattern as your working version)
import { fetchDashboardData } from "../api/budgetAPI.js";

// existing sections
import BudgetSummary from "../components/BudgetSummary.jsx";
import SavingsGoals from "../components/SavingsGoals.jsx";
import ExpensesList from "../components/Expenses.jsx";

// styles (we'll add a few rules below)
import "../styles/BudgetPlanner.css";

export default function BudgetPlanner() {
  const navigate = useNavigate();

  // header back (same UX you used elsewhere)
  const handleBack = () => navigate(-1);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    // keep the responsive flag in sync
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);

    // fetch the dashboard payload
    fetchDashboardData()
      .then((d) => setData(d))
      .catch((err) => {
        console.error("Error fetching budget data:", err);
        setData(null);
      })
      .finally(() => setLoading(false));

    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (loading) {
    return <div className="budget-planner-loading">Loading Budget Planner…</div>;
  }

  if (!data) {
    return (
      <div className="budget-planner-error">
        <p>You haven’t completed your income setup yet.</p>
        <button className="setup-btn" onClick={() => navigate("/IncomeSetup")}>
          Go to Setup
        </button>
      </div>
    );
  }

  const { income, breakdown, savingsGoals, expenses, currency } = data;

  return (
    <div className="budget-page-container">
      {/* Header styled like your Insurance pages */}
      <div className="budget-header">
        <button className="back-btn" onClick={handleBack} aria-label="Back">
          ‹
        </button>
        <h2>Budget Planner</h2>
      </div>

      {/* Content grid similar to your Insurance layout */}
      <div className="budget-grid">
        <section className="budget-card">
          <BudgetSummary income={income} breakdown={breakdown} currency={currency} />
        </section>

        <section className="budget-card">
          <SavingsGoals goals={savingsGoals} currency={currency} />
        </section>

        <section className="budget-card budget-card--full">
          <ExpensesList expenses={expenses} currency={currency} />
        </section>
      </div>
    </div>
  );
}
