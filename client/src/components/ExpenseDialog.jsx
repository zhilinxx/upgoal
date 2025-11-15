import React, { useEffect, useRef, useState, useMemo } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/Expenses.css";

/* ---------- Money & validation helpers (updated) ---------- */
const MAX_DECIMAL_STR = "999,999,999,999.99"; // 12 int + 2 decimal digits
const MAX_INT_DIGITS = 12;

// clean commas
const clean = (v) => String(v ?? "").replace(/,/g, "").trim();

// allow partial typing (≤12 int, ≤2 decimals)
const looksLikeMoney = (v) => /^(\d{0,12})(\.\d{0,2})?$/.test(clean(v));

// strict final check (at least 1 digit)
const amountOK = (v) => /^(\d{1,12})(\.\d{1,2})?$/.test(clean(v));

// normalize to "##########.##" (no scientific notation)
const to2 = (v) => {
  let s = clean(v);
  if (!s) return "";
  let [intPart, decPart = ""] = s.split(".");
  intPart = intPart.replace(/^0+(?=\d)/, "");
  if (!intPart) intPart = "0";
  if (intPart.length > MAX_INT_DIGITS) intPart = intPart.slice(0, MAX_INT_DIGITS);
  decPart = (decPart + "00").slice(0, 2);
  return `${intPart}.${decPart}`;
};

// convert safely to number
const toNum = (v) => Number(to2(v));

// typing sanitizer
const sanitizeMoney = (s) => String(s).replace(/[^0-9.]/g, "");

// check if date is today or past
const isPastOrToday = (iso) => {
  if (!iso) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  return d <= today;
};

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

  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  const recordKey = useMemo(() => {
    const id = initial?.expenses_id;
    return id != null ? String(id) : "__create__";
  }, [initial?.expenses_id]);

  const initialRef = useRef(initial);

  useEffect(() => {
    if (!open) return;
    initialRef.current = initial || {};
    const snap = initialRef.current;

    setName(snap.expenses_name ?? "");
    setAmount(
      snap.expenses_amt != null && snap.expenses_amt !== ""
        ? to2(String(snap.expenses_amt))
        : ""
    );
    setCategory(snap.expenses_category ?? "");
    const iso = snap.expenses_date ? String(snap.expenses_date).slice(0, 10) : "";
    setDate(iso);

    setErrors({ form: "", name: "", amount: "", category: "", date: "" });
    setOpenSaveConfirm(false);
    setOpenCancelConfirm(false);
  }, [open, recordKey]);

  if (!open) return null;

  const validate = () => {
    const next = { form: "", name: "", amount: "", category: "", date: "" };

    if (!name.trim()) next.name = "Please enter an expense name.";

    if (!amountOK(amount)) {
      next.amount = `Amount must be ≤ ${MAX_DECIMAL_STR} with up to 2 decimals.`;
    } else if (!(toNum(amount) >= 0)) {
      next.amount = "Amount cannot be negative.";
    }

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
      expenses_amt: amountOK(amount) ? toNum(amount) : 0,
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

  const askSave = () => {
    if (!validate()) return;
    if (amountOK(amount)) setAmount(to2(amount));
    setOpenSaveConfirm(true);
  };

  const askCancel = () => setOpenCancelConfirm(true);
  const confirmCancel = () => {
    setOpenCancelConfirm(false);
    onClose?.();
  };

  return (
    <>
      {/* base modal */}
      <div
        className="modal-overlay"
        onMouseDown={(e) => e.target === e.currentTarget && askCancel()}
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

          <label>
            Expense Name<span className="req">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Tar Kopitiam"
            autoFocus
          />
          {errors.name && <p className="validation">{errors.name}</p>}

          <label>
            Amount (RM)<span className="req">*</span>
          </label>
          <input
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder={`e.g., 10.50 (≤ ${MAX_DECIMAL_STR})`}
            value={amount}
            onChange={(e) => {
              const raw = sanitizeMoney(e.target.value);
              if (looksLikeMoney(raw)) setAmount(raw);
            }}
            onBlur={(e) => amountOK(e.target.value) && setAmount(to2(e.target.value))}
          />
          {errors.amount && <p className="validation">{errors.amount}</p>}

          <label>
            Category<span className="req">*</span>
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            data-placeholder={category === ""}
          >
            <option value="" disabled>
              -- Select a category --
            </option>
            <option value="Food & Drink">Food & Drink</option>
            <option value="Utility">Utility</option>
            <option value="Other">Other</option>
          </select>
          {errors.category && <p className="validation">{errors.category}</p>}

          <label>
            Date Purchased<span className="req">*</span>
          </label>
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
            <button className="btn-cancel" onClick={askCancel}>
              Cancel
            </button>
            <button className="save-btn" onClick={askSave}>
              Save
            </button>
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
