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
  return (
    <section className="expenses-section">
      <div className="expenses-header">
        <h3 className="section-title">My Expenses</h3>
        <span className="view-all" onClick={() => navigate("/monthly-expenses")}>View all</span>
      </div>
      
      <ul className="expenses-list">
        {expenses.map((expense, index) => (
          // Using index as key is acceptable here since the list is static mock data
          <ExpenseItem key={index} expense={expense} currency={currency} />
        ))}
      </ul>
    </section>
  );
}

export default Expenses;