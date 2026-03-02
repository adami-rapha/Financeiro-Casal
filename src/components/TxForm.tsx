import React, { useState, useEffect, useRef, useMemo } from "react";
import type { Category, Transaction, TxType, Involves, PaidBy } from "../lib/types";
import { uid, currentMonthKey, moneyInputValue } from "../lib/utils";
import CustomSelect from "./Select";

type Props = {
  categories: Category[];
  editing?: Transaction | null;
  activeReserves?: Transaction[];
  onSave: (data: {
    id?: string;
    date: string;
    description: string;
    amount: number;
    type: TxType;
    categoryId: string | null;
    involves: Involves;
    paidBy: PaidBy;
    reserveTargetMonth?: string | null;
    linkedReserveId?: string | null;
  }) => Promise<void>;
  onCancelEdit: () => void;
  onSaved?: () => void;
  compact?: boolean;
  defaultMonthKey?: string;
};

/** Format cents to BRL display string: 12345 -> "123,45" */
function centsToDisplay(cents: number): string {
  if (cents === 0) return "";
  const str = String(cents).padStart(3, "0");
  const reais = str.slice(0, -2);
  const centavos = str.slice(-2);
  const reaisFormatted = reais.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${reaisFormatted},${centavos}`;
}

/** Convert a Transaction amount (float) to cents integer */
function amountToCents(n: number): number {
  return Math.round(n * 100);
}

/** Gera o próximo mês no formato YYYY-MM a partir de hoje */
function nextMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function TxForm({ categories, editing, activeReserves = [], onSave, onCancelEdit, onSaved, compact, defaultMonthKey }: Props) {
  const activeCats = useMemo(
    () => categories.filter(c => !c.archived).slice().sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [categories]
  );

  const getInitialDate = () => {
    if (editing) return editing.date;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (!defaultMonthKey) return todayStr;
    // Se hoje não for o mês que estamos vendo, sugere o primeiro dia do mês visto
    if (!todayStr.startsWith(defaultMonthKey)) {
      return `${defaultMonthKey}-01`;
    }
    return todayStr;
  };

  const [date, setDate] = useState<string>(getInitialDate());
  const [type, setType] = useState<TxType>(editing?.type ?? "expense");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [categoryId, setCategoryId] = useState<string>(editing?.categoryId ?? (activeCats[0]?.id ?? ""));
  const [amountCents, setAmountCents] = useState<number>(editing ? amountToCents(editing.amount) : 0);
  const [involves, setInvolves] = useState<Involves>(editing?.involves ?? "both");
  const [paidBy, setPaidBy] = useState<PaidBy>(editing?.paidBy ?? "me");
  const [error, setError] = useState<string>("");

  // Campos de reserva
  const [reservePrediction, setReservePrediction] = useState<"indeterminate" | "scheduled">(
    editing?.reserveTargetMonth ? "scheduled" : "indeterminate"
  );
  const [reserveTargetMonth, setReserveTargetMonth] = useState<string>(
    editing?.reserveTargetMonth ?? nextMonth()
  );
  const [linkedReserveId, setLinkedReserveId] = useState<string>(
    editing?.linkedReserveId ?? (activeReserves[0]?.id ?? "")
  );

  const amountInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!editing) {
      // Se parou de editar e mudamos o mês, reseta a data para o padrão do novo mês
      setDate(getInitialDate());
      return;
    }
    setDate(editing.date);
    setType(editing.type);
    setDescription(editing.description);
    setCategoryId(editing.categoryId ?? (activeCats[0]?.id ?? ""));
    setAmountCents(amountToCents(editing.amount));
    setInvolves(editing.involves);
    setPaidBy(editing.paidBy);
    setReservePrediction(editing.reserveTargetMonth ? "scheduled" : "indeterminate");
    setReserveTargetMonth(editing.reserveTargetMonth ?? nextMonth());
    setLinkedReserveId(editing.linkedReserveId ?? (activeReserves[0]?.id ?? ""));
    setError("");
  }, [editing]);

  // Quando seleciona uma reserva para resgate, preenche o valor e descrição automaticamente
  React.useEffect(() => {
    if (type !== "reserve-withdraw" || !linkedReserveId) return;
    const reserve = activeReserves.find(r => r.id === linkedReserveId);
    if (reserve) {
      setAmountCents(amountToCents(reserve.amount));
      if (!description || description.startsWith("Resgate: ")) {
        setDescription(`Resgate: ${reserve.description}`);
      }
    }
  }, [linkedReserveId, type, activeReserves]);

  function handleMoneyKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (["Backspace", "Delete", "Tab", "Enter"].includes(e.key)) {
      if (e.key === "Backspace") {
        e.preventDefault();
        setAmountCents(prev => Math.floor(prev / 10));
      }
      return;
    }

    if (!/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    const digit = parseInt(e.key, 10);
    setAmountCents(prev => {
      const next = prev * 10 + digit;
      if (next > 999999999) return prev;
      return next;
    });
  }

  const typeBtn = type === "income" ? "in" : type === "expense" ? "out" : type === "reserve-withdraw" ? "rw" : "tr";
  const typeIcon = type === "income" ? "fa-arrow-down" : type === "expense" ? "fa-arrow-up" : type === "reserve-withdraw" ? "fa-piggy-bank" : "fa-right-left";

  async function submit() {
    setError("");
    const amount = amountCents / 100;
    if (!date) return setError("Informe a data.");
    if (!description.trim()) return setError("Informe a descrição.");
    if (amount <= 0) return setError("Informe um valor maior que zero.");

    if (type === "reserve-withdraw") {
      if (!linkedReserveId) return setError("Selecione a reserva para resgatar.");
      const res = activeReserves.find(r => r.id === linkedReserveId);
      if (res && amount > res.amount + 0.01) {
        return setError(`O valor do resgate não pode ser maior que o saldo da reserva (R$ ${res.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}).`);
      }
    }

    await onSave({
      id: editing?.id,
      date,
      description,
      amount,
      type,
      categoryId: categoryId || null,
      involves,
      paidBy,
      reserveTargetMonth: type === "transfer" && reservePrediction === "scheduled" ? reserveTargetMonth : null,
      linkedReserveId: type === "reserve-withdraw" ? linkedReserveId : null,
    });

    onSaved?.();

    if (!editing) {
      setDescription("");
      setAmountCents(0);
      setLinkedReserveId(activeReserves[0]?.id ?? "");
    } else {
      onCancelEdit();
    }
  }

  return (
    <div className={compact ? "" : "card"}>
      {compact ? null : (
        <div className="hd">
          <div>
            <div className="ttl">{editing ? "Editar lançamento" : "Adicionar lançamento"}</div>
            <div className="hint">Entrada / Saída / Reserva / Resgate.</div>
          </div>
        </div>
      )}

      <div className={compact ? "" : "bd"}>
        <div className="formGrid">
          <div className="field">
            <label>Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="field">
            <label>Tipo</label>
            <CustomSelect
              value={type}
              onChange={(v) => setType(v as TxType)}
              options={[
                { value: "expense", label: "Saída" },
                { value: "income", label: "Entrada" },
                { value: "transfer", label: "Reserva" },
                { value: "reserve-withdraw", label: "Resgate de Reserva" },
              ]}
            />
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Descrição</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: gasolina, internet, salário..." />
          </div>

          {/* Campos extras para reserva */}
          {type === "transfer" && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Previsão de resgate</label>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <CustomSelect
                  value={reservePrediction}
                  onChange={(v) => setReservePrediction(v as "indeterminate" | "scheduled")}
                  options={[
                    { value: "indeterminate", label: "Indeterminada" },
                    { value: "scheduled", label: "Prevista para..." },
                  ]}
                />
                {reservePrediction === "scheduled" && (
                  <input
                    type="month"
                    value={reserveTargetMonth}
                    onChange={(e) => setReserveTargetMonth(e.target.value)}
                    className="month-input"
                    style={{ flex: 1, minWidth: 160 }}
                  />
                )}
              </div>
              <div className="field-hint" style={{ marginTop: 4, fontSize: 12, color: "var(--text-muted)" }}>
                {reservePrediction === "indeterminate"
                  ? "Esta reserva ficará guardada até você resgatar manualmente."
                  : `No mês selecionado, o valor será devolvido automaticamente ao saldo.`}
              </div>
            </div>
          )}

          {/* Campos extras para resgate de reserva */}
          {type === "reserve-withdraw" && (
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label>Reserva para resgatar</label>
              {activeReserves.length === 0 ? (
                <div className="note" style={{ color: "var(--warning-text, #856404)" }}>
                  <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 6 }} />
                  Nenhuma reserva ativa encontrada para resgatar.
                </div>
              ) : (
                <CustomSelect
                  value={linkedReserveId}
                  onChange={(v) => setLinkedReserveId(v)}
                  options={activeReserves.map(r => ({
                    value: r.id,
                    label: `${r.description} — R$ ${r.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${r.date.split("-").reverse().join("/")})`,
                  }))}
                />
              )}
            </div>
          )}

          <div className="field">
            <label>Categoria</label>
            <CustomSelect
              value={categoryId}
              onChange={setCategoryId}
              options={activeCats.map((c: Category) => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="field">
            <label>Valor</label>
            <span className="money-prefix">R$</span>
            <input
              ref={amountInputRef}
              value={centsToDisplay(amountCents)}
              onKeyDown={handleMoneyKeyDown}
              onChange={() => { }} // controlled via keyDown
              inputMode="numeric"
              placeholder="0,00"
              style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              readOnly={false}
            />
          </div>

          <div className="field">
            <label>Envolve</label>
            <CustomSelect
              value={involves}
              onChange={(v) => setInvolves(v as Involves)}
              options={[
                { value: "both", label: "Nós dois" },
                { value: "me", label: "Eu" },
                { value: "her", label: "Ela" }
              ]}
            />
          </div>

          <div className="field">
            <label>Pagador</label>
            <CustomSelect
              value={paidBy}
              onChange={(v) => setPaidBy(v as PaidBy)}
              options={[
                { value: "me", label: "Eu" },
                { value: "her", label: "Ela" }
              ]}
            />
          </div>
        </div>

        {error ? <div className="note" style={{ color: "var(--expense)", fontWeight: 900 }}>{error}</div> : null}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, justifyContent: "flex-end" }}>
          {editing ? (
            <>
              <button className="btn outline" onClick={onCancelEdit}>
                <i className="fa-solid fa-xmark" /> Cancelar
              </button>
              <button className={`btn ${typeBtn}`} onClick={submit}>
                <i className={`fa-solid ${typeIcon}`} /> Salvar
              </button>
            </>
          ) : (
            <button className={`btn ${typeBtn}`} onClick={submit}>
              <i className={`fa-solid ${typeIcon}`} /> Salvar lançamento
            </button>
          )}
        </div>

        {compact ? null : (
          <div className="note">
            Anti-dupla-contagem: se você lança "compras no cartão", lance o pagamento da fatura como <b>reserva</b>, não como despesa.
          </div>
        )}
      </div>
    </div>
  );
}

