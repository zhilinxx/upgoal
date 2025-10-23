import React from "react";
import { Link } from "react-router-dom";

export default function BudgetPlanner() {
  return (
    <div>
      <h2>Budget Planner</h2>
      <p>Here is the budget planner page.</p>

      {/* Text link to Income Setup */}
      <p>
        Go to <Link to="/income-setup" style={{ color: "blue", textDecoration: "underline" }}>Income Setup</Link>
      </p>
    </div>
  );
}
