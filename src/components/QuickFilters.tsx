import React from "react";
import type { Category, Involves, PaidBy, TxType } from "../lib/types";
import CustomSelect from "./Select";

export type Filters = {
  type: TxType | "all";
  categoryId: string | "all";
  involves: Involves | "all";
  paidBy: PaidBy | "all";
  q: string;
};

type Props = {
  categories: Category[];
  filters: Filters;
  onChange: (next: Filters) => void;
};

export default function QuickFilters({ categories, filters, onChange }: Props) {
  const cats = categories.slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="filters-bar">
      <div className="field">
        <label>Tipo</label>
        <CustomSelect
          value={filters.type}
          onChange={(v) => onChange({ ...filters, type: v as any })}
          options={[
            { value: "all", label: "Todos" },
            { value: "income", label: "Entradas" },
            { value: "expense", label: "Saídas" },
            { value: "transfer", label: "Reservas" },
            { value: "reserve-withdraw", label: "Resgates" }
          ]}
        />
      </div>

      <div className="field">
        <label>Categoria</label>
        <CustomSelect
          value={filters.categoryId}
          onChange={(v) => onChange({ ...filters, categoryId: v as any })}
          options={[
            { value: "all", label: "Todas" },
            ...cats.map(c => ({ value: c.id, label: c.name }))
          ]}
        />
      </div>

      <div className="field">
        <label>Envolve</label>
        <CustomSelect
          value={filters.involves}
          onChange={(v) => onChange({ ...filters, involves: v as any })}
          options={[
            { value: "all", label: "Todos" },
            { value: "me", label: "Eu" },
            { value: "her", label: "Ela" },
            { value: "both", label: "Nós dois" }
          ]}
        />
      </div>

      <div className="field">
        <label>Pagador</label>
        <CustomSelect
          value={filters.paidBy}
          onChange={(v) => onChange({ ...filters, paidBy: v as any })}
          options={[
            { value: "all", label: "Todos" },
            { value: "me", label: "Eu" },
            { value: "her", label: "Ela" }
          ]}
        />
      </div>

      <div className="field search">
        <label><i className="fa-solid fa-search" /></label>
        <input value={filters.q} placeholder="Pesquisar..." onChange={(e) => onChange({ ...filters, q: e.target.value })} />
      </div>

      <button className="btn ghost" onClick={() => onChange({ type: "all", categoryId: "all", involves: "all", paidBy: "all", q: "" })}>
        <i className="fa-solid fa-broom" /> Limpar
      </button>
    </div>
  );
}
