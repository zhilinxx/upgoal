import React, { useEffect, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import "../styles/SavingsGoals.css";

/* ---------- Money & date helpers ---------- */
const MAX_DECIMAL_NUM = 9_999_999_999.99;
const MAX_DECIMAL_STR = "9,999,999,999.99";

// allow digits with optional commas, and optional .xx (up to 2 dp)
const amountOK = (v) => /^(\d{1,3}(,\d{3})*|\d+)(\.\d{1,2})?$/.test(String(v).trim());
const toNum = (v) => Number(String(v).replace(/,/g, ""));
const to2 = (v) => {
  const n = toNum(String(v).replace(/,/g, ""));
  return Number.isFinite(n) ? n.toFixed(2) : "";
};

// typing guard: keep at most 2 decimals as user types
const isMoneyTypingOK = (s) => {
  const v = String(s);
  if (v === "") return true;
  if (!/^[0-9,]*\.?[0-9,]*$/.test(v)) return false;
  if ((v.match(/\./g) || []).length > 1) return false;
  const [, dec] = v.split(".");
  if (dec && dec.length > 2) return false;
  return true;
};
const sanitizeMoney = (s) => String(s).replace(/[^0-9.,]/g, "");

const isFuture = (iso) => {
  if (!iso) return false;
  // parse as LOCAL date (not UTC)
  const [y, m, d] = iso.split("-").map(Number);
  const picked = new Date(y, m - 1, d); // local midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return picked > today;
};

export default function GoalDialog({
  mode = "create",          // "create" | "edit"
  open,
  onClose,                  // called when dialog should close (after confirm/cancel)
  onSave,                   // async (payload) => {...}
  initial = {},             // { id, name, target, saved, description, dueDate }
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");      // string for formatting/validation
  const [saved, setSaved] = useState("");        // only in edit
  const [desc, setDesc] = useState("");
  const [due, setDue] = useState("");

  // inline error messages like Login
  const [errors, setErrors] = useState({
    form: "",
    name: "",
    target: "",
    saved: "",
    due: "",
  });

  // confirm dialog states
  const [openSaveConfirm, setOpenSaveConfirm] = useState(false);
  const [openCancelConfirm, setOpenCancelConfirm] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial.name ?? "");
      setTarget(initial.target != null ? to2(initial.target) : "");
      setSaved(
        mode === "edit"
          ? (initial.saved != null ? to2(initial.saved) : "")
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
    if (field === "name") setName(value);
    if (field === "target") setTarget(value);
    if (field === "saved") setSaved(value);
    if (field === "desc") setDesc(value);
    if (field === "due") setDue(value);
    setErrors((e) => ({ ...e, [field === "desc" ? "form" : field]: "" }));
  };

  const validate = () => {
    const next = { form: "", name: "", target: "", saved: "", due: "" };

    if (!name.trim()) next.name = "Please enter a goal name.";

    if (!amountOK(target)) {
      next.target = "Goal Amount must be a number with up to 2 decimals.";
    } else {
      const n = toNum(target);
      if (!(n >= 0)) next.target = "Goal Amount cannot be negative.";
      else if (n > MAX_DECIMAL_NUM) next.target = `Goal Amount exceeds the maximum RM ${MAX_DECIMAL_STR}.`;
    }

    if (mode === "edit" && saved !== "") {
      if (!amountOK(saved)) next.saved = "Saved Amount must be a valid number (max 2 decimals).";
      else {
        const s = toNum(saved);
        if (!(s >= 0)) next.saved = "Saved Amount cannot be negative.";
        else if (s > MAX_DECIMAL_NUM) next.saved = `Saved Amount exceeds the maximum RM ${MAX_DECIMAL_STR}.`;
      }
    }

    if (!due) next.due = "Please pick a due date.";
    else if (!isFuture(due)) next.due = "Due Date must be in the future.";

    setErrors(next);
    return !Object.values(next).some(Boolean);
  };

  // Build the payload exactly like before
  const buildPayload = () => {
    const payload = {
      name: name.trim(),
      target: Number(to2(target)),           // number guaranteed 2dp
      description: desc.trim() || null,      // allow empty
      dueDate: due,                          // yyyy-mm-dd
    };
    if (mode === "edit") {
      payload.saved = saved ? Number(to2(saved)) : 0;
    }
    return payload;
  };

  // Called only after confirmation
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

  // Click handlers for the buttons
  const askSave = () => {
    if (!validate()) return;
    setOpenSaveConfirm(true);
  };

  const askCancel = () => {
    setOpenCancelConfirm(true);
  };

  const confirmCancel = () => {
    setOpenCancelConfirm(false);
    onClose?.();
  };

  return (
    <>
      <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && askCancel()}>
        <div className="modal-card" role="dialog" aria-modal="true">
          <h3>{mode === "edit" ? "Edit Goal" : "Add New Goal"}</h3>

          {errors.form && <p className="validation">{errors.form}</p>}

          <label>Name<span className="req">*</span></label>
          <input
            value={name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Give a goal name"
          />
          {errors.name && <p className="validation">{errors.name}</p>}

          <label>Goal Amount<span className="req">*</span></label>
          <input
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={`Set amount for goal (≤ ${MAX_DECIMAL_STR})`}
            value={target}
            onChange={(e) => {
              const raw = sanitizeMoney(e.target.value);
              if (isMoneyTypingOK(raw)) setField("target", raw);
            }}
            onBlur={(e) => setField("target", to2(e.target.value))}
          />
          {errors.target && <p className="validation">{errors.target}</p>}

          {mode === "edit" && (
            <>
              <label>Saved Amount</label>
              <input
                inputMode="decimal"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Enter saved amount"
                value={saved}
                onChange={(e) => {
                  const raw = sanitizeMoney(e.target.value);
                  if (isMoneyTypingOK(raw)) setField("saved", raw);
                }}
                onBlur={(e) => setField("saved", to2(e.target.value))}
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

          <label>Due Date<span className="req">*</span></label>
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
            <button className="btn-cancel" onClick={askCancel}>Cancel</button>
            <button className="save-btn" onClick={askSave}>Save</button>
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
