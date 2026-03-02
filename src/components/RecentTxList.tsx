import React from "react";
import type { Category, Transaction } from "../lib/types";
import { fmtBRL } from "../lib/utils";

function typeBadge(t: Transaction["type"]) {
  if (t === "income") return { cls: "income", icon: "fa-arrow-down", sign: "+", amtCls: "amount in" };
  if (t === "expense") return { cls: "expense", icon: "fa-arrow-up", sign: "-", amtCls: "amount out" };
  return { cls: "transfer", icon: "fa-right-left", sign: "→", amtCls: "amount tr" };
}

function involvesLabel(v: Transaction["involves"]) {
  if (v === "me") return "Eu";
  if (v === "her") return "Ela";
  return "Nós dois";
}

export default function RecentTxList({
  categories,
  items,
  onAdd,
}: {
  categories: Category[];
  items: Transaction[];
  onAdd: () => void;
}) {
  const catById = new Map(categories.map(c => [c.id, c.name] as const));
  // Descending sort by createdAt (newest first)
  const recent = items.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 8);

  return (
    <div className="card">
      <div className="hd">
        <div>
          <div className="ttl">Últimos lançamentos</div>
          <div className="hint">Mês selecionado</div>
        </div>
        <button className="btn primary" onClick={onAdd}>
          <i className="fa-solid fa-plus" /> Adicionar
        </button>
      </div>

      <div className="bd">
        {recent.length === 0 ? (
          <div className="note">Nada lançado neste mês ainda.</div>
        ) : (
          <div className="txList">
            {recent.map(tx => {
              const b = typeBadge(tx.type);
              const cat = tx.categoryId ? (catById.get(tx.categoryId) ?? "—") : "—";
              return (
                <div key={tx.id} className="txItem">
                  <div className="txLeft">
                    <span className={`badge ${b.cls}`}>
                      <i className={`fa-solid ${b.icon}`} />
                    </span>
                    <div className="txMeta">
                      <div className="txTitle">{tx.description}</div>
                      <div className="txSub">{tx.date.split("-").reverse().join("/")} • {involvesLabel(tx.involves)}</div>
                    </div>
                  </div>
                  <div className="txRight">
                    <div className={b.amtCls} style={{ fontSize: 13 }}>{b.sign} {fmtBRL.format(tx.amount)}</div>
                    <div className="txCat">{cat}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
