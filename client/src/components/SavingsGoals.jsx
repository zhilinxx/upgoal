// import React, { useState } from "react";
// import { toast } from "react-toastify";
// import GoalDialog from "./GoalDialog.jsx";
// import { createGoal, updateGoal, deleteGoal } from "../api/budgetAPI.js";

// const GoalItem = ({ goal, currency }) => {
//   const amountLeft = goal.target - goal.current;
//   const progressPercent = (goal.current / goal.target) * 100;
  
//   return (
//     <div className="goal-card">
//       <div className="goal-header">
//         <h4>{goal.name}</h4>
//         <div className="goal-actions">
//           <button title="Update Progress">↻</button>
//           <button title="Edit Goal">✎</button>
//           <button title="Delete Goal">🗑️</button>
//         </div>
//       </div>

//       <p className="goal-progress-text">
//         <span className="current-amount">{currency} {goal.current}</span> / {goal.target}
//         <span className="amount-left">{currency} {amountLeft} left</span>
//       </p>

//       <div className="progress-bar-container">
//         <div 
//           className="progress-bar-fill" 
//           style={{ width: `${progressPercent}%` }}
//         ></div>
//       </div>

//       <p className="goal-deadline">
//         Goal needs to be completed by <span className="date">{goal.deadline}.</span>
//       </p>
//     </div>
//   );
// };

// function SavingsGoals({ goals, currency }) {
//   return (
//     <section className="savings-goals-section">
//       <h3 className="section-title">My Savings Goals</h3>
//       <div className="goals-carousel">
//         {/* Add Another Goal UI */}
//         <div className="add-goal-box">
//           <div className="add-goal-icon">+</div>
//           <p className="add-goal-label">Add Another Goal</p>
//         </div>
        
//         {/* Render Goals */}
//         {goals.map(g => <GoalItem key={g.id} goal={g} currency={currency} />)}
//       </div>

//       <div className="paginator">
//           {/* Mock paginator based on number of goals */}
//           {goals.map((_, index) => (
//             <span key={index} className={`dot ${index === 0 ? 'active' : ''}`}></span>
//           ))}
//       </div>
//     </section>
//   );
// }

// export default SavingsGoals;
//------------------------------------------------------------------
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import GoalDialog from "./GoalDialog.jsx";
import { createGoal, updateGoal, deleteGoal, listGoals } from "../api/budgetAPI.js";
import "../styles/SavingsGoals.css";

/* Money helpers (DECIMAL(12,2)) */
const MAX_DECIMAL_NUM = 9_999_999_999.99;
const fmtMoney = (n, currency = "RM") =>
  `${currency} ${Number(n || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const toPercent = (cur = 0, tgt = 0) => {
  const c = Number(cur) || 0;
  const t = Number(tgt) || 0;
  if (t <= 0) return 0;
  const p = (c / t) * 100;
  return Math.max(0, Math.min(100, p));
};

const GoalItem = ({ goal, currency, onEdit, onDelete }) => {
  const amountLeft = Math.max(0, (goal.target || 0) - (goal.current || 0));
  const progressPercent = toPercent(goal.current, goal.target);

  return (
    <div className="goal-card">
      <div className="goal-header">
        <h4>{goal.name}</h4>
        <div className="goal-actions">
          <button title="Update Progress" onClick={() => onEdit(goal)}>↻</button>
          <button title="Edit Goal" onClick={() => onEdit(goal)}>✎</button>
          <button title="Delete Goal" onClick={() => onDelete(goal.id)}>🗑️</button>
        </div>
      </div>

      <p className="goal-progress-text">
        <span className="current-amount">{fmtMoney(goal.current, currency)}</span> / {fmtMoney(goal.target, currency)}
        <span className="amount-left">{fmtMoney(amountLeft, currency)} left</span>
      </p>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="goal-deadline">
        Goal needs to be completed by{" "}
        <span className="date">
          {goal.deadline
            ? new Date(goal.deadline).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "-"}
          .
        </span>
      </p>
    </div>
  );
};

export default function SavingsGoals({ currency = "RM" }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create"); // "create" | "edit"
  const [initial, setInitial] = useState({});

  // Load from API
  useEffect(() => {
    (async () => {
      try {
        const { data } = await listGoals();
        setItems(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load goals.");
      }
    })();
  }, []);

  const startCreate = () => {
    setMode("create");
    setInitial({});
    setOpen(true);
  };

  const startEdit = (goal) => {
    setMode("edit");
    setInitial({
      id: goal.id,
      name: goal.name,
      target: goal.target,
      saved: goal.current,      // dialog uses "saved" for the editable current
      description: goal.description || "",
      dueDate: goal.deadline,   // dialog accepts dueDate
    });
    setOpen(true);
  };

  const removeGoal = async (id) => {
    if (!window.confirm("Remove this goal?")) return;
    try {
      await deleteGoal(id);
      setItems((xs) => xs.filter((g) => g.id !== id));
      toast.success("Goal removed.");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to remove goal.");
    }
  };

  // Dialog save handler (called with payload from GoalDialog)
  const handleSave = async (payload) => {
    if (mode === "create") {
      const { data } = await createGoal(payload);
      const created = data || {
        id: Date.now(),
        name: payload.name,
        target: payload.target,
        current: 0,
        deadline: payload.dueDate,
        description: payload.description,
      };
      setItems((xs) => [created, ...xs]);
    } else {
      // mode === "edit"
      const id = initial.id;
      const apiPayload = {
        name: payload.name,
        target: payload.target,
        description: payload.description,
        dueDate: payload.dueDate,
        saved: payload.saved ?? 0, // GoalDialog provides saved only in edit
      };
      const { data } = await updateGoal(id, apiPayload);
      const updated = data || {
        id,
        name: apiPayload.name,
        target: apiPayload.target,
        current: apiPayload.saved,
        deadline: apiPayload.dueDate,
        description: apiPayload.description,
      };
      setItems((xs) =>
        xs.map((g) =>
          g.id === id
            ? {
                ...g,
                name: updated.name,
                target: updated.target,
                current: updated.current ?? apiPayload.saved,
                deadline: updated.deadline ?? apiPayload.dueDate,
                description: updated.description ?? apiPayload.description,
              }
            : g
        )
      );
    }
  };

  return (
    <section className="savings-goals-section">
      <h3 className="section-title">My Savings Goals</h3>

      <div className="goals-carousel">
        {/* Add Another Goal UI */}
        <div className="add-goal-box" onClick={startCreate} role="button" tabIndex={0}>
          <div className="add-goal-icon">+</div>
          <p className="add-goal-label">Add Another Goal</p>
        </div>

        {/* Render Goals */}
        {items.map((g) => (
          <GoalItem
            key={g.id}
            goal={g}
            currency={currency}
            onEdit={startEdit}
            onDelete={removeGoal}
          />
        ))}
      </div>

      {/* Simple paginator dots */}
      <div className="paginator">
        {items.map((_, i) => (
          <span key={i} className={`dot ${i === 0 ? "active" : ""}`} />
        ))}
      </div>

      {/* Dialog */}
      <GoalDialog
        mode={mode}
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        initial={initial}
      />
    </section>
  );
}
