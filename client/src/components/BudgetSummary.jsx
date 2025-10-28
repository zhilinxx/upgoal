import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import '../styles/BudgetSummary.css';

ChartJS.register(ArcElement, Tooltip, Legend);

function BudgetSummary({ income, breakdown, currency }) {
  const chartData = {
    labels: breakdown.map(item => item.name),
    datasets: [
      {
        data: breakdown.map(item => item.amount),
        backgroundColor: breakdown.map(item => item.color),
        // Set a constant borderWidth to reserve space and use transparent color
        borderWidth: 5,
        borderColor: 'rgba(255, 255, 255, 0)', 
        hoverOffset: 0, 
        hoverBorderWidth: 5,
        hoverBorderColor: 'white', // Ensure the hover color is visible against the background
      },
    ],
  };

  return (
    <div className="budget-summary-section">
      <div className="doughnut-container">
        <Doughnut
          data={chartData}
          options={{
            cutout: "70%",
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (context) => {
                    let label = context.label || '';
                    if (label) { label += ': '; }
                    label += `${currency} ${context.formattedValue}`;
                    return label;
                  }
                }
              }
            },
          }}
        />
        <div className="chart-center">
          <p className="chart-label">Aug Income</p>
          <h3 className="chart-amount">{currency} {income.toLocaleString()}</h3>
        </div>
      </div>

      <div className="legend-area">
        <ul className="legend-list">
          {breakdown.map((item, index) => (
            <li key={item.name} className="legend-item">
              <span className="color-dot" style={{ backgroundColor: item.color }}></span>
              <div className="legend-details">
                <span className="legend-name">{item.name}</span>
                <span className="legend-value">{currency} {item.amount.toLocaleString()}</span>
              </div>
            </li>
          ))}
        </ul>
        <p className="follow-text">Please follow it !!!</p>
      </div>
    </div>
  );
}

export default BudgetSummary;