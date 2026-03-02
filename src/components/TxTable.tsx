import React, { useRef, useState } from "react";
import type { Category, Transaction } from "../lib/types";
import { fmtBRL } from "../lib/utils";
import { getCategoryIcon } from "../lib/categoryIcons";

type Props = {
  categories: Category[];
  items: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => Promise<void>;
  onReorder: (ids: string[]) => Promise<void>;
};

function typeBadge(t: Transaction["type"]) {
  if (t === "income") return { label: "Entrada", cls: "income", icon: "fa-arrow-down", sign: "+" };
  if (t === "expense") return { label: "Saída", cls: "expense", icon: "fa-arrow-up", sign: "-" };
  if (t === "reserve-withdraw") return { label: "Resgate", cls: "reserve-withdraw", icon: "fa-piggy-bank", sign: "+" };
  return { label: "Reserva", cls: "transfer", icon: "fa-right-left", sign: "→" };
}

function involvesLabel(v: Transaction["involves"]) {
  if (v === "me") return "Eu";
  if (v === "her") return "Ela";
  return "Nós dois";
}

function paidByLabel(v: Transaction["paidBy"]) {
  return v === "me" ? "Eu" : "Ela";
}

export default function TxTable({ categories, items, onEdit, onDelete, onReorder }: Props) {
  const catMap = new Map(categories.map(c => [c.id, c] as const));
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const dragCounter = useRef(0);

  function handleDragStart(e: React.DragEvent, idx: number) {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    // Make the drag image semi-transparent
    const row = e.currentTarget as HTMLElement;
    row.style.opacity = "0.4";
  }

  function handleDragEnd(e: React.DragEvent) {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    setDragIdx(null);
    setOverIdx(null);
    dragCounter.current = 0;
  }

  function handleDragEnter(e: React.DragEvent, idx: number) {
    e.preventDefault();
    dragCounter.current++;
    setOverIdx(idx);
  }

  function handleDragLeave() {
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      setOverIdx(null);
      dragCounter.current = 0;
    }
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }

  async function handleDrop(e: React.DragEvent, targetIdx: number) {
    e.preventDefault();
    setOverIdx(null);
    dragCounter.current = 0;

    if (dragIdx === null || dragIdx === targetIdx) return;

    const newItems = [...items];
    const [moved] = newItems.splice(dragIdx, 1);
    newItems.splice(targetIdx, 0, moved);

    const ids = newItems.map(tx => tx.id);
    await onReorder(ids);
    setDragIdx(null);
  }

  return (
    <div className="card">
      <div className="hd">
        <div>
          <div className="ttl">Lançamentos</div>
          <div className="hint">{items.length} itens no mês · arraste para reordenar</div>
        </div>
      </div>

      <div className="bd" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: 36 }}></th>
              <th style={{ width: 100 }}>Data</th>
              <th>Descrição</th>
              <th style={{ width: 140 }}>Categoria</th>
              <th style={{ width: 90 }}>Envolve</th>
              <th style={{ width: 70 }}>Pagador</th>
              <th style={{ width: 110 }} className="right">Valor</th>
              <th style={{ width: 80 }} className="right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 18, color: "var(--text-muted)" }}>Sem lançamentos neste mês.</td></tr>
            ) : items.map((tx, idx) => {
              const cat = tx.categoryId ? catMap.get(tx.categoryId) : null;
              const catName = cat ? cat.name : "—";
              const catIcon = cat ? getCategoryIcon(cat.name) : "";
              const b = typeBadge(tx.type);
              const amtCls = tx.type === "income" || tx.type === "reserve-withdraw" ? "amount in" : tx.type === "expense" ? "amount out" : "amount tr";
              const isOver = overIdx === idx && dragIdx !== idx;

              return (
                <tr
                  key={tx.id}
                  draggable={!tx.isAuto}
                  onDragStart={tx.isAuto ? undefined : (e) => handleDragStart(e, idx)}
                  onDragEnd={tx.isAuto ? undefined : handleDragEnd}
                  onDragEnter={tx.isAuto ? undefined : (e) => handleDragEnter(e, idx)}
                  onDragLeave={tx.isAuto ? undefined : handleDragLeave}
                  onDragOver={tx.isAuto ? undefined : handleDragOver}
                  onDrop={tx.isAuto ? undefined : (e) => handleDrop(e, idx)}
                  className={`${isOver ? "drag-over" : ""} ${tx.isAuto ? "is-auto" : ""}`}
                >
                  <td className="drag-handle">
                    {!tx.isAuto && <i className="fa-solid fa-grip-vertical" />}
                  </td>
                  <td style={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                    {tx.date.split("-").reverse().join("/")}
                  </td>
                  <td>
                    <span className={`badge ${b.cls}`} style={{ marginRight: 8 }}>
                      <i className={`fa-solid ${b.icon}`} />
                    </span>
                    <span style={{ fontWeight: 700 }}>{tx.description}</span>
                    {tx.type === "transfer" && tx.reserveTargetMonth && (
                      <span className="reserve-target-badge" title={`Resgate previsto: ${tx.reserveTargetMonth}`}>
                        <i className="fa-solid fa-calendar-check" />
                        {tx.reserveTargetMonth.split("-").reverse().join("/")}
                      </span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {catIcon && <i className={catIcon} style={{ fontSize: 11, color: "var(--text-muted)" }} />}
                      <span>{catName}</span>
                    </div>
                  </td>
                  <td>{tx.isAuto ? "—" : involvesLabel(tx.involves)}</td>
                  <td>{tx.isAuto ? "—" : paidByLabel(tx.paidBy)}</td>
                  <td className={`right ${amtCls}`}>{b.sign} {fmtBRL.format(tx.amount)}</td>
                  <td className="right">
                    {tx.isAuto ? (
                      <i className="fa-solid fa-lock" style={{ color: "var(--text-muted)", fontSize: 13 }} title="Gerado automaticamente" />
                    ) : (
                      <>
                        <button className="iconBtn" onClick={() => onEdit(tx)} title="Editar">
                          <i className="fa-solid fa-pen" />
                        </button>
                        <button className="iconBtn" onClick={() => onDelete(tx.id)} title="Remover" style={{ color: "var(--expense)" }}>
                          <i className="fa-solid fa-trash" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
