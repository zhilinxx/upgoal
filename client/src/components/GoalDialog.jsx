import React, { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/SavingsGoals.css";

/* ---------- Money & date helpers ---------- */
// ✅ updated numeric handling (no scientific notation)
const MAX_DECIMAL_STR = "999,999,999,999.99"; // 12 int digits + 2 decimals
const MAX_INT_DIGITS = 12;

// clean commas
const clean = (v) => String(v ?? "").replace(/,/g, "").trim();

// allow partial typing (≤12 int digits, ≤2 decimals)
const looksLikeMoney = (v) => /^(\d{0,12})(\.\d{0,2})?$/.test(clean(v));

// strict check (at least 1 digit)
const amountOK = (v) => /^(\d{1,12})(\.\d{1,2})?$/.test(clean(v));

// normalize to safe 2-dp string (never 1e+30)
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

// convert to Number only after validation
const toNum = (v) => Number(to2(v));

// prevent e, +, -, etc.
const sanitizeMoney = (s) => String(s).replace(/[^0-9.]/g, "");

// check date future (local)
const isFuture = (iso) => {
  if (!iso) return false;
  const [y, m, d] = iso.split("-").map(Number);
  const picked = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked > today;
};

export default function GoalDialog({
  mode = "create",
  open,
  onClose,
  onSave,
  initial = {},
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");

  const [errors, setErrors] = useState({
    form: "",
    name: "",
    target: "",
    saved: "",
    due: "",
  });

  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial.name ?? "");
      setTarget(initial.target != null ? to2(initial.target) : "");
      setSaved(
        mode === "edit"
          ? initial.saved != null
            ? to2(initial.saved)
            : ""
          : ""
      );
      setDesc(initial.description ?? "");
      const iso = initial.dueDate ? String(initial.dueDate).substring(0, 10) : "";
      setDue(iso);

      setErrors({ form: "", name: "", target: "", saved: "", due: "" });
      setOpenSaveConfirm(false);
      setOpenCancelConfirm(false);
    }
  }, [open, initial, mode]);

  if (!open) return null;

  const setField = (field, value) => {
    if (field === "target") {
      const raw = sanitizeMoney(value);
      if (!looksLikeMoney(raw)) return;
      setTarget(raw);
    } else if (field === "saved") {
      const raw = sanitizeMoney(value);
      if (!looksLikeMoney(raw)) return;
      setSaved(raw);
    } else if (field === "name") setName(value);
    else if (field === "desc") setDesc(value);
    else if (field === "due") setDue(value);

    setErrors((e) => ({ ...e, [field === "desc" ? "form" : field]: "" }));
  };

  const validate = () => {
    const next = { form: "", name: "", target: "", saved: "", due: "" };

    if (!name.trim()) next.name = "Please enter a goal name.";

    if (!amountOK(target)) {
      next.target = `Goal Amount must be ≤ ${MAX_DECIMAL_STR} with up to 2 decimals.`;
    }

    if (mode === "edit" && saved !== "") {
      if (!amountOK(saved)) {
        next.saved = `Saved Amount must be ≤ ${MAX_DECIMAL_STR} with up to 2 decimals.`;
      }
    }

    if (!due) next.due = "Please pick a due date.";
    else if (!isFuture(due)) next.due = "Due Date must be in the future.";

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  const buildPayload = () => {
    const payload = {
      name: name.trim(),
      target: amountOK(target) ? toNum(target) : 0,
      description: desc.trim() || null,
      dueDate: due,
    };
    if (mode === "edit") {
      payload.saved = saved && amountOK(saved) ? toNum(saved) : 0;
    }
    return payload;
  };

  const saveNow = async () => {
    try {
      const payload = buildPayload();
      await onSave(payload);
      onClose?.();
    } catch (e) {
      console.error(e);
      setErrors((x) => ({ ...x, form: "Failed to save goal." }));
    } finally {
      setOpenSaveConfirm(false);
    }
  };

  const askSave = () => {
    if (!validate()) return;
    if (amountOK(target)) setTarget(to2(target));
    if (mode === "edit" && saved && amountOK(saved)) setSaved(to2(saved));
    setOpenSaveConfirm(true);
  };

  const askCancel = () => setOpenCancelConfirm(true);
  const confirmCancel = () => {
    setOpenCancelConfirm(false);
    onClose?.();
  };

  return (
    <>
      <div
        className="modal-overlay"
        onMouseDown={(e) => e.target === e.currentTarget && askCancel()}
      >
        <div className="modal-card" role="dialog" aria-modal="true">
          <h3>{mode === "edit" ? "Edit Goal" : "Add New Goal"}</h3>

          {errors.form && <p className="validation">{errors.form}</p>}

          <label>
            Name<span className="req">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Give a goal name"
          />
          {errors.name && <p className="validation">{errors.name}</p>}

          <label>
            Goal Amount<span className="req">*</span>
          </label>
          <input
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder={`Set amount for goal (≤ ${MAX_DECIMAL_STR})`}
            value={target}
            onChange={(e) => setField("target", e.target.value)}
            onBlur={(e) => amountOK(e.target.value) && setField("target", to2(e.target.value))}
          />
          {errors.target && <p className="validation">{errors.target}</p>}

          {mode === "edit" && (
            <>
              <label>Saved Amount</label>
              <input
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter saved amount"
                value={saved}
                onChange={(e) => setField("saved", e.target.value)}
                onBlur={(e) =>
                  saved && amountOK(e.target.value) && setField("saved", to2(e.target.value))
                }
              />
              {errors.saved && <p className="validation">{errors.saved}</p>}
            </>
          )}

          <label>Description</label>
          <textarea
            value={desc}
            onChange={(e) => setField("desc", e.target.value)}
            placeholder="Add a description for the goal"
            rows={3}
          />

          <label>
            Due Date<span className="req">*</span>
          </label>
          <div className="date-row">
            <input
              type="date"
              className="calendar-icon"
              value={due}
              onChange={(e) => setField("due", e.target.value)}
            />
          </div>

          {errors.due && <p className="validation">{errors.due}</p>}

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

      {/* ====== Confirm: Save ====== */}
      <ConfirmDialog
        open={openSaveConfirm}
        action="save"
        subject={mode === "edit" ? "these changes" : "this new goal"}
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenSaveConfirm(false)}
        onConfirm={saveNow}
      />

      {/* ====== Confirm: Cancel ====== */}
      <ConfirmDialog
        open={openCancelConfirm}
        action="cancel"
        subject={mode === "edit" ? "these changes" : "for adding new goal"}
        message={
          mode === "edit"
            ? "Do you confirm to discard these changes?"
            : "Do you confirm to cancel for adding new goal?"
        }
        cancelText="Cancel"
        confirmText="Confirm"
        onCancel={() => setOpenCancelConfirm(false)}
        onConfirm={confirmCancel}
      />
    </>
  );
}
