import React, { useEffect, useRef, useState, useMemo } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/Expenses.css";

/* ---------- Validation helpers ---------- */
const amountOK = (v) => /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/.test(String(v).trim());
const toNum = (v) => Number(String(v).replace(/,/g, ""));
const to2 = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(2) : "";
};
const isPastOrToday = (iso) => {
  if (!iso) return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(iso); d.setHours(0, 0, 0, 0);
  return d <= today;
};

/* ---------- Typing guard for money ---------- */
const isMoneyTypingOK = (s) => {
  const v = String(s);
  if (v === "") return true;
  if (!/^[0-9,]*\.?[0-9,]*$/.test(v)) return false;
  if ((v.match(/\./g) || []).length > 1) return false;
  const [, dec] = v.split(".");
  if (dec && dec.length > 2) return false;
  return true;
};
const sanitizeMoney = (s) => s.replace(/[^0-9.,]/g, "");

export default function ExpenseDialog({
  open,
  mode = "create",        // "create" | "edit"
  initial = {},           // { expenses_id, expenses_name, expenses_amt, expenses_category, expenses_date }
  onClose,                // () => void
  onSave,                 // async (payload) => void
}) {
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");

  const [errors, setErrors] = useState({
    form: "",
    name: "",
    amount: "",
    category: "",
    date: "",
  });

  // confirm dialog states
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  // ----- IMPORTANT: use a stable primitive key instead of the whole object -----
  const recordKey = useMemo(() => {
    const id = initial?.expenses_id;
    return id != null ? String(id) : "__create__";
  }, [initial?.expenses_id]);

  // snapshot of initial (updated only when we hydrate)
  const initialRef = useRef(initial);

  // Hydrate fields ONLY when: dialog opens OR we switched to a different record id
  useEffect(() => {
    if (!open) return;
    initialRef.current = initial || {};
    const snap = initialRef.current;

    setName(snap.expenses_name ?? "");
    setAmount(snap.expenses_amt != null ? to2(snap.expenses_amt) : "");
    setCategory(snap.expenses_category ?? "");
    const iso = snap.expenses_date ? String(snap.expenses_date).slice(0, 10) : "";
    setDate(iso);

    setErrors({ form: "", name: "", amount: "", category: "", date: "" });
    setOpenSaveConfirm(false);
    setOpenCancelConfirm(false);
  }, [open, recordKey]); // ✅ not `[initial]`

  if (!open) return null;

  const validate = () => {
    const next = { form: "", name: "", amount: "", category: "", date: "" };

    if (!name.trim()) next.name = "Please enter an expense name.";

    if (!amountOK(amount)) next.amount = "Amount must be an integer or decimal with up to 2 decimals.";
    else if (!(toNum(amount) >= 0)) next.amount = "Amount cannot be negative.";

    if (!category) next.category = "Please select a category before continuing!";

    if (!date) next.date = "Please select a date.";
    else if (!isPastOrToday(date)) next.date = "Date must be today or in the past.";

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const buildPayload = () => {
    const id = initialRef.current?.expenses_id;
    return {
      expenses_name: name.trim(),
      expenses_amt: Number(to2(amount)),
      expenses_category: category,
      expenses_date: date,
      ...(id ? { expenses_id: id } : {}),
    };
  };

  const saveNow = async () => {
    try {
      const payload = buildPayload();
      await onSave?.(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      setErrors((x) => ({ ...x, form: "Failed to save expense." }));
    } finally {
      setOpenSaveConfirm(false);
    }
  };

  const askSave = () => { if (validate()) setOpenSaveConfirm(true); };

  // Only open cancel confirm in response to user actions (not from effects)
  const askCancel = () => setOpenCancelConfirm(true);
  const confirmCancel = () => { setOpenCancelConfirm(false); onClose?.(); };

  return (
    <>
      {/* base modal */}
      <div
        className="modal-overlay"
        onMouseDown={(e) => e.target === e.currentTarget && askCancel()}
        /* When a confirm is open, ignore pointer events on the base overlay */
        style={{
          pointerEvents: openSaveConfirm || openCancelConfirm ? "none" : "auto",
        }}
        aria-hidden={openSaveConfirm || openCancelConfirm ? "true" : "false"}
      >
        <div
          className="modal-card"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h3>{mode === "edit" ? "Edit Expense" : "Add New Expense"}</h3>

          {errors.form && <p className="validation">{errors.form}</p>}

          <label>Expense Name<span className="req">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tar Kopitiam"
            autoFocus
          />
          {errors.name && <p className="validation">{errors.name}</p>}

          <label>Amount (RM)<span className="req">*</span></label>
          <input
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g., 10.50"
            value={amount}
            onChange={(e) => {
              const raw = sanitizeMoney(e.target.value);
              if (isMoneyTypingOK(raw)) setAmount(raw);
            }}
            onBlur={(e) => setAmount(to2(e.target.value))}
          />
          {errors.amount && <p className="validation">{errors.amount}</p>}

          <label>Category<span className="req">*</span></label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-placeholder={category === ""}
          >
            <option value="" disabled>-- Select a category --</option>
            <option value="Food & Drink">Food & Drink</option>
            <option value="Utility">Utility</option>
            <option value="Other">Other</option>
          </select>
          {errors.category && <p className="validation">{errors.category}</p>}

          <label>Date Purchased<span className="req">*</span></label>
          <div className="date-row">
            <input
              type="date"
              className="calendar-icon"
              value={date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
              data-placeholder={!date} 
            />
          </div>
          {errors.date && <p className="validation">{errors.date}</p>}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={askCancel}>Cancel</button>
            <button className="save-btn" onClick={askSave}>Save</button>
          </div>
        </div>
      </div>

      {/* confirm: save */}
      <ConfirmDialog
        open={openSaveConfirm}
        action="save"
        subject={mode === "edit" ? "this expense" : "this new expense"}
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenSaveConfirm(false)}
        onConfirm={saveNow}
      />

      {/* confirm: cancel */}
      <ConfirmDialog
        open={openCancelConfirm}
        action="cancel"
        subject={mode === "edit" ? "these changes" : "for adding new expense"}
        message={
          mode === "edit"
            ? "Do you confirm to discard these changes?"
            : "Do you confirm to cancel for adding new expense?"
        }
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenCancelConfirm(false)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
