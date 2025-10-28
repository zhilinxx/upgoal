import React from 'react';
import '../styles/SavingsGoals.css';

const GoalItem = ({ goal, currency }) => {
  const amountLeft = goal.target - goal.current;
  const progressPercent = (goal.current / goal.target) * 100;
  
  return (
    <div className="goal-card">
      <div className="goal-header">
        <h4>{goal.name}</h4>
        <div className="goal-actions">
          <button title="Update Progress">↻</button>
          <button title="Edit Goal">✎</button>
          <button title="Delete Goal">🗑️</button>
        </div>
      </div>

      <p className="goal-progress-text">
        <span className="current-amount">{currency} {goal.current}</span> / {goal.target}
        <span className="amount-left">{currency} {amountLeft} left</span>
      </p>

      <div className="progress-bar-container">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${progressPercent}%` }}
        ></div>
      </div>

      <p className="goal-deadline">
        Goal needs to be completed by <span className="date">{goal.deadline}.</span>
      </p>
    </div>
  );
};

function SavingsGoals({ goals, currency }) {
  return (
    <section className="savings-goals-section">
      <h3 className="section-title">My Savings Goals</h3>
      <div className="goals-carousel">
        {/* Add Another Goal UI */}
        <div className="add-goal-box">
          <div className="add-goal-icon">+</div>
          <p className="add-goal-label">Add Another Goal</p>
        </div>
        
        {/* Render Goals */}
        {goals.map(g => <GoalItem key={g.id} goal={g} currency={currency} />)}
      </div>

      <div className="paginator">
          {/* Mock paginator based on number of goals */}
          {goals.map((_, index) => (
            <span key={index} className={`dot ${index === 0 ? 'active' : ''}`}></span>
          ))}
      </div>
    </section>
  );
}

export default SavingsGoals;