import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

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

  const overlay = (
    <div
      className="modal-overlay modal-overlay--confirm"
      role="dialog"
      aria-modal="true"
      aria-label="Confirmation dialog"
      onMouseDown={(e) => e.target === e.currentTarget && onCancel?.()}
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel?.();
        if (e.key === "Enter") onConfirm?.();
      }}
    >
      <div
        className="modal-card"
        style={{
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <h3 style={{color:"var(--main-pink)"}}>Confirm</h3>
        <p style={{ marginTop: 6, color: "var(--text-color)" }}>{message ?? defaultMessage}</p>

        <div className="modal-actions" style={{ display:"flex", justifyContent:"center" }}>
          <button className="btn-cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`btn-confirm ${variant === "danger" ? "danger" : "primary"}`}
            onClick={onConfirm}
            ref={confirmBtnRef}
          >
            {computedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );

  // Portal so it always renders above everything else
  return createPortal(overlay, document.body);
}
