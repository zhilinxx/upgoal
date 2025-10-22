import React, { useState } from "react";
import "../styles/MonthlyExpenses.css";

function MonthlyExpenses() {
  const [expenses, setExpenses] = useState([
    { id: 5, name: "Tar Kopitiam", amount: 10.5, category: "Food & Drink" },
    { id: 4, name: "Digi topup", amount: 30.0, category: "Utility" },
    { id: 3, name: "Shopee", amount: 20.5, category: "Other" },
    { id: 2, name: "Milk tea", amount: 9.0, category: "Food & Drink" },
    { id: 1, name: "Earphones", amount: 9.0, category: "Other" },
  ]);

  return (
    <div className="expenses-container">
      <h2 className="title">Monthly Expenses</h2>

      <div className="top-controls">
        <input type="text" placeholder="Enter expense name" className="search-input" />
        <select className="category-filter">
          <option>All Categories</option>
        </select>
        <button className="icon-btn delete-btn">🗑</button>
        <button className="icon-btn add-btn">＋</button>
      </div>

      <div className="chart-section">
        <div className="donut-chart-placeholder">
          Aug Total <br /> RM 79.00
        </div>
        <ul className="legend">
          <li><span className="dot food"></span>Food & Drink • RM 19.50</li>
          <li><span className="dot utility"></span>Utility • RM 30.00</li>
          <li><span className="dot other"></span>Other • RM 29.50</li>
        </ul>
      </div>

      <table className="expense-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Expenses</th>
            <th>Amount (RM)</th>
            <th>Category</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((item) => (
            <tr key={item.id}>
              <td>{item.id}</td>
              <td>{item.name}</td>
              <td>{item.amount.toFixed(2)}</td>
              <td>{item.category}</td>
              <td>
                <button className="icon-btn edit-btn">✏️</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button className="page-btn">Previous</button>
        <span className="page-number">1</span>
        <button className="page-btn">Next</button>
      </div>
    </div>
  );
}

export default MonthlyExpenses;
