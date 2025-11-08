import React from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import "../styles/BudgetSummary.css";

ChartJS.register(ArcElement, Tooltip, Legend);

function BudgetSummary({ income, breakdown, currency }) {
  const chartData = {
    labels: breakdown.map((item) => item.name),
    datasets: [
      {
        data: breakdown.map((item) => item.amount),
        backgroundColor: breakdown.map((item) => item.color),
        borderWidth: 5,
        borderColor: "rgba(255, 255, 255, 0)",
        hoverOffset: 0,
        hoverBorderWidth: 5,
        hoverBorderColor: "white",
      },
    ],
  };

  const monthLabel = new Date().toLocaleString(undefined, { month: "short" });

  return (
    <div className="budget-summary-section">
      <div className="budget-doughnut-container">
        <Doughnut
          data={chartData}
          options={{
            // lets the canvas fill the container we size in CSS
            maintainAspectRatio: false,
            // controls donut thickness (bigger % = bigger hole)
            cutout: "72%",
            plugins: {
              legend: { display: false },
              tooltip: {
                displayColors: false,
                callbacks: {
                  title: () => "", // hide auto title
                  label: (ctx) => `${ctx.label}: ${currency} ${ctx.formattedValue}`,
                },
              },
            },
          }}
        />

        <div className="budget-chart-center">
          <p className="budget-chart-label">{monthLabel} Income</p>
          <h3 className="budget-chart-amount">
            {currency} {Number(income || 0).toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="budget-legend-area">
        <ul className="budget-legend-list">
          {breakdown.map((item) => (
            <li key={item.name} className="budget-legend-item">
              <span className="budget-legend-left">
                <span
                  className="budget-color-dot"
                  style={{ backgroundColor: item.color }}
                />
                <span className="budget-legend-name">{item.name}</span>
              </span>

              <span className="budget-legend-value">
                {currency} {Number(item.amount).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>

        <p className="budget-follow-text">Please follow it !!!</p>
      </div>
    </div>
  );
}

export default BudgetSummary;
