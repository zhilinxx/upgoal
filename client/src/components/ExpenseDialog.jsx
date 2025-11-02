import React, { useEffect, useRef, useState } from "react";

/* ---------- Validation helpers (R1 & R2) ---------- */
const amountOK = (v) => /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/.test(String(v).trim());
const toNum = (v) => Number(String(v).replace(/,/g, ""));
const to2 = (v) => {
  const n = toNum(v);
  return Number.isFinite(n) ? n.toFixed(2) : "";
};

// Only allow past or today (not future)
const isPastOrToday = (iso) => {
  if (!iso) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  const d = new Date(iso);  d.setHours(0,0,0,0);
  return d <= today;
};

/* ---------- Typing guard for money ---------- */
// allow "", "0", "0.", "12", "12.", "12.3", "12.34", with optional commas; block letters
const isMoneyTypingOK = (s) => {
  const v = String(s);
  if (v === "") return true;
  if (!/^[0-9,]*\.?[0-9,]*$/.test(v)) return false;       // only digits/commas/one dot
  if ((v.match(/\./g) || []).length > 1) return false;    // max one dot
  const [, dec] = v.split(".");
  if (dec && dec.length > 2) return false;                // max 2 dp while typing
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
  const [category, setCategory] = useState("Food & Drink");
  const [date, setDate] = useState("");

  const [errors, setErrors] = useState({ form: "", name: "", amount: "", date: "" });

  // keep a snapshot of `initial` at the moment we open
  const initialRef = useRef(initial);

  useEffect(() => {
    if (open) {
      // snapshot current initial values ONLY when opening
      initialRef.current = initial;
      const snap = initialRef.current || {};

      setName(snap.expenses_name ?? "");
      setAmount(snap.expenses_amt != null ? to2(snap.expenses_amt) : "");
      setCategory(snap.expenses_category || "Food & Drink");
      const iso = snap.expenses_date ? String(snap.expenses_date).slice(0, 10) : "";
      setDate(iso);
      setErrors({ form: "", name: "", amount: "", date: "" });
    }
  }, [open]); // <-- depend ONLY on `open`

  if (!open) return null;

  const validate = () => {
    const next = { form: "", name: "", amount: "", date: "" };

    if (!name.trim()) next.name = "Please enter an expense name.";

    if (!amountOK(amount)) next.amount = "Amount must be an integer or decimal with up to 2 decimals.";
    else if (!(toNum(amount) >= 0)) next.amount = "Amount cannot be negative.";

    if (!date) next.date = "Please select a date.";
    else if (!isPastOrToday(date)) next.date = "Date must be today or in the past.";

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const handleSave = async () => {
    if (!validate()) return;

    const id = initialRef.current?.expenses_id; // use the snapshot
    const payload = {
      expenses_name: name.trim(),
      expenses_amt: Number(to2(amount)),
      expenses_category: category,
      expenses_date: date, // yyyy-mm-dd
      ...(id ? { expenses_id: id } : {}),
    };

    try {
      await onSave(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      setErrors((x) => ({ ...x, form: "Failed to save expense." }));
    }
  };

  const cancel = () => onClose?.();

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
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
            if (isMoneyTypingOK(raw)) setAmount(raw); // blocks letters, allows 12. / 12.3 while typing
          }}
          onBlur={(e) => setAmount(to2(e.target.value))} // normalize to 2 d.p.
        />
        {errors.amount && <p className="validation">{errors.amount}</p>}

        <label>Category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option>Food & Drink</option>
          <option>Utility</option>
          <option>Other</option>
        </select>

        <label>Date Purchased<span className="req">*</span></label>
        <div className="date-row">
          <input
            type="date"
            value={date}
            max={new Date().toISOString().slice(0,10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        {errors.date && <p className="validation">{errors.date}</p>}

        <div className="modal-actions">
          <button className="btn" onClick={cancel}>Cancel</button>
          <button className="btn primary" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
