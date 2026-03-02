import React, { useMemo, useState } from "react";
import type { Category } from "../lib/types";
import { getCategoryIcon } from "../lib/categoryIcons";

type Props = {
  categories: Category[];
  onAdd: (name: string) => Promise<void>;
  onArchive: (id: string) => Promise<void>;
  onUnarchive: (id: string) => Promise<void>;
};

export default function CategoryManager({ categories, onAdd, onArchive, onUnarchive }: Props) {
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const active = useMemo(() => categories.filter(c => !c.archived).slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [categories]);
  const archived = useMemo(() => categories.filter(c => c.archived).slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")), [categories]);

  async function add() {
    setErr("");
    try {
      await onAdd(name);
      setName("");
    } catch (e: any) {
      setErr(e?.message ?? "Falha ao adicionar categoria.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Add */}
      <div className="card">
        <div className="hd">
          <div>
            <div className="ttl">Nova Categoria</div>
            <div className="hint">Crie categorias para organizar seus lançamentos.</div>
          </div>
        </div>
        <div className="bd">
          <div style={{ display: "flex", gap: 10 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Nome</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Educação, Presentes, Viagem..."
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
            </div>
            <button className="btn primary" onClick={add}>
              <i className="fa-solid fa-plus" /> Adicionar
            </button>
          </div>
          {err ? <div className="note" style={{ color: "var(--expense)", fontWeight: 800 }}>{err}</div> : null}
        </div>
      </div>

      {/* Active */}
      <div className="card">
        <div className="hd">
          <div>
            <div className="ttl">Ativas</div>
            <div className="hint">{active.length} categorias</div>
          </div>
        </div>
        <div className="bd">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {active.map(c => (
              <span
                key={c.id}
                className="badge transfer"
                style={{ padding: "7px 12px", gap: 10 }}
              >
                <i className={getCategoryIcon(c.name)} />
                {c.name}
                <button
                  className="iconBtn"
                  onClick={() => onArchive(c.id)}
                  title="Arquivar"
                  style={{ width: 28, height: 28, fontSize: 12 }}
                >
                  <i className="fa-solid fa-box-archive" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Archived */}
      {archived.length > 0 && (
        <div className="card">
          <div className="hd">
            <div>
              <div className="ttl">Arquivadas</div>
              <div className="hint">{archived.length} categorias</div>
            </div>
          </div>
          <div className="bd">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {archived.map(c => (
                <span
                  key={c.id}
                  className="badge"
                  style={{
                    padding: "7px 12px", gap: 10,
                    background: "var(--bg-surface)", borderColor: "var(--border)", color: "var(--text-muted)",
                  }}
                >
                  <i className={getCategoryIcon(c.name)} />
                  {c.name}
                  <button
                    className="iconBtn"
                    onClick={() => onUnarchive(c.id)}
                    title="Reativar"
                    style={{ width: 28, height: 28, fontSize: 12 }}
                  >
                    <i className="fa-solid fa-rotate-left" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
