import React from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

export function ConfirmDialog({ open, title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = true, onConfirm, onCancel }) {
  if (!open) return null;

  const dialog = (
    <div className="confirmOverlay" role="dialog" aria-modal="true" aria-labelledby="confirmDialogTitle">
      <section className="confirmPanel">
        <div className="confirmIcon">
          <AlertTriangle size={22} />
        </div>
        <div>
          <span>Confirmación requerida</span>
          <h2 id="confirmDialogTitle">{title}</h2>
          <p>{message}</p>
        </div>
        <div className="confirmActions">
          <button className="ghostButton" type="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className={danger ? "dangerButtonInline" : "primaryButton compact"} type="button" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );

  return createPortal(dialog, document.body);
}
