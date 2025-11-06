import React, { useEffect, useRef } from "react";

export default function ConfirmDialog({
  open,
  action = "proceed",
  subject = "",
  message,
  variant = "default",
  confirmText,
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) {
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (open && confirmBtnRef.current) confirmBtnRef.current.focus();
  }, [open]);

  if (!open) return null;

  const normalizedAction = String(action).trim();
  const computedConfirmText =
    confirmText ||
    (variant === "danger"
      ? (normalizedAction || "Delete").charAt(0).toUpperCase() +
        (normalizedAction || "delete").slice(1)
      : (normalizedAction || "Confirm").charAt(0).toUpperCase() +
        (normalizedAction || "confirm").slice(1));

  const defaultMessage = `Do you confirm to ${normalizedAction}${
    subject ? ` ${subject}` : ""
  }?`;

  const onOverlayMouseDown = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onCancel?.();
    if (e.key === "Enter") onConfirm?.();
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={onOverlayMouseDown}
      onKeyDown={onKeyDown}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmation dialog"
    >
      <div className="modal-card">
        <h3>Confirm</h3>
        <p style={{ marginTop: 6, color: "var(--text-color)" }}>{message ?? defaultMessage}</p>

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn-confirm ${
              variant === "danger" ? "danger" : "primary"
            }`}
            onClick={onConfirm}
            ref={confirmBtnRef}
          >
            {computedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

