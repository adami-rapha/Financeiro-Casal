import React from "react";

export type ToastKind = "success" | "error" | "info";
export type ToastState = { kind: ToastKind; message: string } | null;

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  React.useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(onClose, 2800);
    return () => window.clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const icon =
    toast.kind === "success" ? "fa-circle-check" :
    toast.kind === "error" ? "fa-triangle-exclamation" :
    "fa-circle-info";

  return (
    <div className={`toast ${toast.kind}`} role="status" aria-live="polite">
      <i className={`fa-solid ${icon}`} />
      <div style={{ fontWeight: 900, fontSize: 13 }}>{toast.message}</div>
      <button className="iconBtn" onClick={onClose} aria-label="Fechar toast" style={{ color: "rgba(255,255,255,.85)" }}>
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}
