import React, { useMemo } from "react";
import type { Category, Transaction } from "../lib/types";
import { fmtBRL } from "../lib/utils";
import { getCategoryIcon } from "../lib/categoryIcons";

type Props = {
  categories: Category[];
  items: Transaction[];
};

const CAT_COLORS = [
  "#6366f1", "#f87171", "#34d399", "#fbbf24", "#60a5fa",
  "#a78bfa", "#f472b6", "#fb923c", "#2dd4bf", "#e879f9",
];

export default function CategorySummary({ categories, items }: Props) {
  const catById = new Map(categories.map(c => [c.id, c] as const));

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of items) {
      if (tx.type !== "expense") continue;
      const key = tx.categoryId ?? "__none__";
      map.set(key, (map.get(key) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([k, v], i) => {
        const cat = k === "__none__" ? null : catById.get(k);
        return {
          id: k,
          name: cat ? cat.name : (k === "__none__" ? "Sem categoria" : "Removida"),
          icon: cat ? getCategoryIcon(cat.name) : "fa-solid fa-circle-question",
          amount: v,
          color: CAT_COLORS[i % CAT_COLORS.length],
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [items, categories]);

  const total = rows.reduce((a, b) => a + b.amount, 0);

  return (
    <div className="card">
      <div className="hd">
        <div>
          <div className="ttl">Resumo por Categoria</div>
          <div className="hint">Somente itens do tipo <b>Saída</b></div>
        </div>
        <span className="badge expense">
          <i className="fa-solid fa-arrow-up" /> {fmtBRL.format(total)}
        </span>
      </div>

      <div className="bd">
        {rows.length === 0 ? (
          <div className="note">Sem saídas para agrupar.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {rows.slice(0, 10).map(r => {
              const pct = total > 0 ? (r.amount / total) * 100 : 0;
              return (
                <div key={r.id} style={{ display: "grid", gridTemplateColumns: "130px 1fr auto", gap: 12, alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, fontSize: 12, color: "var(--text)", overflow: "hidden" }}>
                    <span className="cat-icon" style={{ background: `${r.color}18`, color: r.color }}>
                      <i className={r.icon} />
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  </div>
                  <div className="bar">
                    <div className="fill" style={{ width: `${Math.min(100, pct)}%`, background: `linear-gradient(90deg, ${r.color}, ${r.color}88)` }} />
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 12, color: "var(--text)", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                    {fmtBRL.format(r.amount)}
                    <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 6 }}>{pct.toFixed(0)}%</span>
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
