import React from "react";

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

export default function Modal({ open, title, onClose, children }: Props) {
  if (!open) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalCard" onClick={(e) => e.stopPropagation()}>
        <div className="hd" style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--border)" }}>
          <div className="ttl">{title}</div>
          <button className="iconBtn" onClick={onClose}>
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
