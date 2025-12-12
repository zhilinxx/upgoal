import React, { useEffect, useRef, useState } from "react";
import { FiEdit2, FiTrash2 } from "react-icons/fi";
import { toast } from "react-toastify";
import GoalDialog from "./GoalDialog.jsx";
import ConfirmDialog from "./ConfirmDialog.jsx";
import { createGoal, updateGoal, deleteGoal, listGoals } from "../api/budgetAPI.js";
import "../styles/SavingsGoals.css";

/* DECIMAL(12,2) */
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

// Local-date formatter to avoid UTC shifting
function formatDueLocal(iso, locale = undefined) {
  if (!iso) return "";
  const [y, m, d] = String(iso).substring(0, 10).split("-").map(Number);
  const dt = new Date(y, m - 1, d); // local midnight
  return dt.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const GoalItem = ({ goal, currency, onEdit, onAskDelete }) => {
  const amountLeft = Math.max(0, (goal.target || 0) - (goal.current || 0));
  const progressPercent = toPercent(goal.current, goal.target);

  return (
    <div className="goal-card">
      <div className="goal-header">
        <h4>{goal.name}</h4>
        <div className="goal-actions">
          <button title="Edit Goal" onClick={() => onEdit(goal)}>
            <FiEdit2 />
          </button>
          <button title="Delete Goal" onClick={() => onAskDelete(goal)}>
            <FiTrash2 />
          </button>
        </div>
      </div>

      <p className="goal-progress-text">
        <span className="current-amount">{fmtMoney(goal.current, currency)}</span>
        {" / "}
        {fmtMoney(goal.target, currency)}
        <span className="amount-left">{fmtMoney(amountLeft, currency)} left</span>
      </p>

      <div className="progress-bar-container">
        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }} />
      </div>

      <p className="goal-deadline">
        Goal needs to be completed by{" "}
        <span className="date">
          {goal.deadline ? formatDueLocal(goal.deadline) : "-"}.
        </span>
      </p>
    </div>
  );
};

export default function SavingsGoals({ currency = "RM" }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("create");
  const [initial, setInitial] = useState({});

  // Delete confirm state
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(null);

  // Carousel + paginator
  const scrollerRef = useRef(null);
  const [active, setActive] = useState(0);
  const [press, setPress] = useState({ x: 0, y: 0 });

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

  // Ensure initial position shows the start
  useEffect(() => {
    scrollerRef.current?.scrollTo({ left: 0 });
  }, []);

  // Add pill: tap vs drag detection 
  const handleAddPointerDown = (e) => {
    const p = e.touches?.[0] ?? e;
    setPress({ x: p.clientX, y: p.clientY });
  };
  const handleAddPointerUp = (e) => {
    const p = e.changedTouches?.[0] ?? e;
    const dx = Math.abs(p.clientX - press.x);
    const dy = Math.abs(p.clientY - press.y);
    if (dx < 6 && dy < 6) startCreate();
  };

  // Layout numbers: width of add pill + gap 
  const RAIL = 56; // width of .add-goal-box
  const GAP = 18;

  const slideWidth = () => {
    const el = scrollerRef.current;
    return el ? el.clientWidth - (RAIL + GAP) : 0;
  };
  const stride = () => slideWidth() + GAP;

  // Scroll -> update active dot (0 => first goal) 
  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const offset = Math.max(0, el.scrollLeft - (RAIL + GAP));
    const idx = Math.round(offset / stride());
    if (idx !== active) setActive(idx);
  };

  const goToSlide = (i) => {
    const el = scrollerRef.current;
    if (!el) return;
    const target = (RAIL + GAP) + i * stride();
    el.scrollTo({ left: target, behavior: "smooth" });
  };

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
      saved: goal.current,
      description: goal.description || "",
      dueDate: goal.deadline,
    });
    setOpen(true);
  };

  const askDelete = (goal) => {
    setDeleting(goal);
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteGoal(deleting.id);
      setItems((xs) => xs.filter((g) => g.id !== deleting.id));
      toast.success("Goal deleted.");
    } catch (e) {
      console.error(e);
      toast.error(e?.response?.data?.error || "Failed to delete goal.");
    } finally {
      setOpenDelete(false);
      setDeleting(null);
    }
  };

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
      toast.success("Goal created.");
    } else {
      const id = initial.id;
      const apiPayload = {
        name: payload.name,
        target: payload.target,
        description: payload.description,
        dueDate: payload.dueDate,
        saved: payload.saved ?? 0,
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
      toast.success("Goal updated.");
    }
  };

  const isEmpty = items.length === 0;

  return (
    <section className="savings-goals-section">
      <h3 className="section-title">My Savings Goals</h3>

      {/* merged rail with conditional is-empty class */}
      <div
        className={`goals-carousel ${isEmpty ? "is-empty" : ""}`}
        ref={scrollerRef}
        onScroll={handleScroll}
      >
        {/* Show the vertical Add pill ONLY when there is at least one goal */}
        {!isEmpty && (
          <button
            type="button"
            className="add-goal-box"
            onPointerDown={handleAddPointerDown}
            onPointerUp={handleAddPointerUp}
            onTouchStart={handleAddPointerDown}
            onTouchEnd={handleAddPointerUp}
            aria-label="Add Another Goal"
            tabIndex={0}
          >
            <div className="add-goal-icon">+</div>
            <p className="add-goal-label">Add Another Goal</p>
          </button>
        )}

        {isEmpty ? (
          <div className="empty-align">
            <div className="goal-card">
              <p style={{ margin: 0, color: "#999" }}>No savings goal yet.</p>
              <button
                type="button"
                className="save-btn"
                onClick={startCreate}
                style={{ marginTop: "15px", whiteSpace: "nowrap" }}
              >
                Add Goal
              </button>
            </div>
          </div>
        ) : (
          items.map((g) => (
            <GoalItem
              key={g.id}
              goal={g}
              currency={currency}
              onEdit={startEdit}
              onAskDelete={askDelete}
            />
          ))
        )}
      </div>

      {/* Paginator (one dot per GOAL) — hidden when empty */}
      {!isEmpty && (
        <div className="paginator">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              className={`dot ${active === i ? "active" : ""}`}
              onClick={() => goToSlide(i)}
              aria-label={`Go to goal ${i + 1}`}
            />
          ))}
        </div>
      )}

      <GoalDialog
        mode={mode}
        open={open}
        onClose={() => setOpen(false)}
        onSave={handleSave}
        initial={initial}
      />

      <ConfirmDialog
        open={openDelete}
        action="delete"
        subject={deleting ? `"${deleting.name}"` : "this goal"}
        variant="danger"
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => {
          setOpenDelete(false);
          setDeleting(null);
        }}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
