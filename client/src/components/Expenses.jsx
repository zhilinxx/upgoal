import React from 'react';
import '../styles/Expenses.css';
import { useNavigate } from "react-router-dom";

const ExpenseItem = ({ expense, currency }) => (
  <li className="expense-item">
    <span className="expense-name">{expense.name}</span>
    <span className="expense-amount">- {currency} {expense.amount.toFixed(2)}</span>
  </li>
);

function Expenses({ expenses, currency }) {
  const navigate = useNavigate();
  const hasExpenses = expenses && expenses.length > 0;

  return (
    <section className="expenses-list-section">
      <div className="expenses-list-header">
        <h3 className="expenses-list-title">My Expenses</h3>
        <span className="view-all" onClick={() => navigate("/monthlyExpenses")}>View all</span>
      </div>

      {/* ✅ Show message when there are no expenses */}
      {!hasExpenses ? (
        <div className="no-expense-message">
          <p style={{ color: "#999", textAlign: "center", margin: "12px 0" }}>
            No expense yet.
          </p>
        </div>
      ) : (
        <ul className="expenses-list">
          {expenses
            .map((e, i) => ({ ...e, _idx: i }))     // tag original position
            .sort((a, b) => {
              const dateDiff = new Date(b.date) - new Date(a.date);
              if (dateDiff !== 0) return dateDiff;
              return b._idx - a._idx;               // later in list → newer
            })
            .slice(0, 10)
            .map((expense) => (
              <ExpenseItem
                key={expense.id || expense._idx}
                expense={expense}
                currency={currency}
              />
            ))}
        </ul>
      )}
    </section>
  );
}

export default Expenses;
