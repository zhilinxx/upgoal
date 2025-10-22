import React, { useState, useEffect } from "react";
import { fetchDashboardData } from "../services/api"; 
import BudgetSummary from "../components/BudgetSummary";
import SavingsGoals from "../components/SavingsGoals";
import ExpensesList from "../components/Expenses";
import "../styles/BudgetPlanner.css"; 

function BudgetPlanner() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch data using the service layer
  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch(err => console.error("Error fetching budget data:", err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="budget-planner-loading">Loading Budget Planner...</div>;
  }
  
  if (!data) {
    return <div className="budget-planner-error">Failed to load dashboard data.</div>;
  }

  // Destructure data for cleaner passing to components
  const { income, breakdown, savingsGoals, expenses, currency } = data;

  return (
    <div className="budget-planner-page">
      {/* Assuming Navbar is rendered globally, or we add a header here */}
      <header className="budget-planner-header">
        <span className="header-icon">☰</span>
        <h2 className="title">Budget Planner</h2>
        <div className="header-user-settings">
            <span role="img" aria-label="user">👤</span>
            <span role="img" aria-label="settings" style={{marginLeft: '10px'}}>⚙️</span>
        </div>
      </header>

      <div className="main-budget-content">
        <BudgetSummary 
          income={income} 
          breakdown={breakdown} 
          currency={currency} 
        />
        
        <SavingsGoals 
          goals={savingsGoals} 
          currency={currency} 
        />
        
        <ExpensesList 
          expenses={expenses} 
          currency={currency} 
        />
      </div>
    </div>
  );
}

export default BudgetPlanner;
