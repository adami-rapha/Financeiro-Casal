import React from "react";
import MonthPicker from "./components/MonthPicker";
import KpiRow from "./components/KpiRow";
import CoupleBreakdown from "./components/CoupleBreakdown";
import TxForm from "./components/TxForm";
import TxTable from "./components/TxTable";
import CategoryManager from "./components/CategoryManager";
import CategorySummary from "./components/CategorySummary";
import QuickFilters, { type Filters } from "./components/QuickFilters";
import RecentTxList from "./components/RecentTxList";
import Modal from "./components/Modal";
import Toast, { type ToastState } from "./components/Toast";
import ReportPage from "./components/ReportPage";
import { PieChart, BarChart } from "./components/Charts";
import { useTheme } from "./lib/ThemeContext";
import { computeCarryOver } from "./lib/carryOver";

import type { Category, Transaction } from "./lib/types";
import { currentMonthKey, monthLabel } from "./lib/utils";
import { ensureSeed } from "./lib/seed";
import {
  addCategory,
  archiveCategory,
  listCategories,
  listMonths,
  listTransactionsByMonth,
  listAllTransactions,
  unarchiveCategory,
  upsertTransaction,
  deleteTransaction,
  reorderTransactions,
  getActiveReserves,
} from "./lib/repo";

type PageKey = "dash" | "tx" | "cat" | "reports";

function uniqueSortedMonths(existing: string[], include: string): string[] {
  const set = new Set(existing);
  set.add(include);
  return Array.from(set).sort();
}

function prevMonthKey(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, (m - 1), 1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthKey(mk: string): string {
  const [y, m] = mk.split("-").map(Number);
  const d = new Date(y, (m - 1), 1);
  d.setMonth(d.getMonth() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  const [page, setPage] = React.useState<PageKey>("dash");

  const [categories, setCategories] = React.useState<Category[]>([]);
  const [months, setMonths] = React.useState<string[]>([]);
  const [monthKey, setMonthKey] = React.useState<string>(currentMonthKey());

  const [items, setItems] = React.useState<Transaction[]>([]);
  const [allTx, setAllTx] = React.useState<Transaction[]>([]);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [activeReserves, setActiveReserves] = React.useState<Transaction[]>([]);

  const [filters, setFilters] = React.useState<Filters>({
    type: "all", categoryId: "all", involves: "all", paidBy: "all", q: "",
  });

  const [txModalOpen, setTxModalOpen] = React.useState(false);
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [isPrinting, setIsPrinting] = React.useState(false);
  const [toastState, setToastState] = React.useState<ToastState>(null);

  function toast(message: string, kind: "success" | "error" | "info" = "success") {
    setToastState({ message, kind });
  }

  async function refreshAll() {
    const cats = await listCategories(true);
    setCategories(cats);
    const ms = await listMonths();
    const merged = uniqueSortedMonths(ms, currentMonthKey());
    setMonths(merged);
    if (!merged.includes(monthKey)) setMonthKey(currentMonthKey());
    const all = await listAllTransactions();
    setAllTx(all);
    const reserves = await getActiveReserves(monthKey);
    setActiveReserves(reserves);
  }

  async function refreshMonthData(mk: string) {
    const tx = await listTransactionsByMonth(mk);
    setItems(tx);
  }

  React.useEffect(() => {
    (async () => { await ensureSeed(); await refreshAll(); })();
  }, []);

  React.useEffect(() => { refreshMonthData(monthKey); setEditing(null); }, [monthKey]);

  // Carry-over computation (must be above visibleItems to be used there)
  const carryOver = React.useMemo(() => {
    return computeCarryOver(allTx, monthKey);
  }, [allTx, monthKey]);

  // Sort by sortOrder (supports drag-and-drop reordering) and inject auto-transactions
  const visibleItems = React.useMemo(() => {
    const list = items
      .filter(tx => {
        if (filters.type !== "all" && tx.type !== filters.type) return false;
        if (filters.categoryId !== "all" && (tx.categoryId ?? "") !== filters.categoryId) return false;
        if (filters.involves !== "all" && tx.involves !== filters.involves) return false;
        if (filters.paidBy !== "all" && tx.paidBy !== filters.paidBy) return false;
        if (filters.q.trim()) {
          if (!tx.description.toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
        }
        return true;
      })
      .slice()
      .sort((a, b) => a.sortOrder - b.sortOrder);

    // Create phantom transactions unconditionally if there's any carry-over data (or zero if we just started)
    // to show the history cleanly. But we'll only show them if no filters are active, to keep filtering clean.
    const hasAnyFilter = filters.type !== "all" || filters.categoryId !== "all" || filters.involves !== "all" || filters.paidBy !== "all" || filters.q.trim() !== "";
    if (hasAnyFilter) return list;

    const autoTx: Transaction[] = [];

    // Saldo Anterior
    if (carryOver.previousBalance !== 0 || allTx.some(t => t.monthKey < monthKey)) {
      autoTx.push({
        id: "auto-balance",
        date: `${monthKey}-01`,
        monthKey: monthKey,
        description: "Saldo do Mês Anterior",
        amount: Math.abs(carryOver.previousBalance),
        type: carryOver.previousBalance >= 0 ? "income" : "expense",
        categoryId: null,
        involves: "both",
        paidBy: "me",
        sortOrder: -2,
        isAuto: true,
        createdAt: 0,
        updatedAt: 0,
      });
    }

    // Reservas Acumuladas
    if (carryOver.accumulatedReserves !== 0) {
      autoTx.push({
        id: "auto-reserve",
        date: `${monthKey}-01`,
        monthKey: monthKey,
        description: "Reservas Acumuladas (Meses anteriores)",
        amount: carryOver.accumulatedReserves,
        type: "transfer",
        categoryId: null,
        involves: "both",
        paidBy: "me",
        sortOrder: -1,
        isAuto: true,
        createdAt: 0,
        updatedAt: 0,
      });
    }

    // Resgates automáticos de reservas com mês previsto
    carryOver.autoWithdrawals.forEach((reserve, i) => {
      autoTx.push({
        id: `auto-withdraw-${reserve.id}`,
        date: `${monthKey}-01`,
        monthKey: monthKey,
        description: `Resgate automático: ${reserve.description}`,
        amount: reserve.amount,
        type: "reserve-withdraw",
        categoryId: reserve.categoryId,
        involves: reserve.involves,
        paidBy: reserve.paidBy,
        sortOrder: -0.5 + (i * 0.01),
        isAuto: true,
        linkedReserveId: reserve.id,
        createdAt: 0,
        updatedAt: 0,
      });
    });

    return [...autoTx, ...list];
  }, [items, filters, carryOver, monthKey, allTx]);

  const totals = React.useMemo(() => {
    let income = 0, expense = 0, transfer = 0, withdraw = 0;
    for (const tx of visibleItems) {
      // Contador de totais mensais: ignora fantasmas de saldo anterior/reservas,
      // mas inclui resgates automáticos para que o saldo do mês reflita a devolução do dinheiro.
      if (tx.isAuto && tx.type !== "reserve-withdraw") continue;

      if (tx.type === "income") income += tx.amount;
      else if (tx.type === "expense") expense += tx.amount;
      else if (tx.type === "transfer") transfer += tx.amount;
      else if (tx.type === "reserve-withdraw") withdraw += tx.amount;
    }
    return { income, expense, transfer, withdraw };
  }, [visibleItems]);

  // Couple breakdown (unfiltered month data for accurate totals)
  const coupleData = React.useMemo(() => {
    let bothExp = 0, meExp = 0, herExp = 0;
    let bothInc = 0, meInc = 0, herInc = 0;
    for (const tx of items) {
      if (tx.type === "expense") {
        if (tx.involves === "both") bothExp += tx.amount;
        else if (tx.involves === "me") meExp += tx.amount;
        else herExp += tx.amount;
      } else if (tx.type === "income") {
        if (tx.involves === "both") bothInc += tx.amount;
        else if (tx.involves === "me") meInc += tx.amount;
        else herInc += tx.amount;
      }
    }
    return { bothExp, meExp, herExp, bothInc, meInc, herInc, totalExp: bothExp + meExp + herExp };
  }, [items]);

  async function handleSaveTx(data: any, opts?: { keepTab?: boolean }) {
    try {
      await upsertTransaction(data);
      const newMonthKey = data.date.slice(0, 7);
      await refreshAll();
      setMonthKey(newMonthKey);
      await refreshMonthData(newMonthKey);
      toast("Lançamento salvo.", "success");
      if (!opts?.keepTab) setPage("dash");
    } catch (e: any) {
      toast(e?.message ?? "Falha ao salvar.", "error");
      throw e;
    }
  }

  async function handleDeleteTx(id: string) {
    const ok = confirm("Remover este lançamento?");
    if (!ok) return;
    await deleteTransaction(id);
    await refreshMonthData(monthKey);
    await refreshAll();
    toast("Lançamento removido.", "info");
  }

  async function handleAddCategory(name: string) {
    await addCategory(name);
    await refreshAll();
    toast("Categoria adicionada.", "success");
  }

  async function handleArchiveCategory(id: string) {
    await archiveCategory(id);
    await refreshAll();
    toast("Categoria arquivada.", "info");
  }

  async function handleUnarchiveCategory(id: string) {
    await unarchiveCategory(id);
    await refreshAll();
    toast("Categoria reativada.", "success");
  }

  function onPrev() {
    const mk = prevMonthKey(monthKey);
    setMonthKey(mk);
    setMonths(uniqueSortedMonths(months, mk));
  }

  function onNext() {
    const mk = nextMonthKey(monthKey);
    setMonthKey(mk);
    setMonths(uniqueSortedMonths(months, mk));
  }

  const pageTitle =
    page === "dash" ? "Dashboard" :
      page === "tx" ? "Lançamentos" :
        page === "reports" ? "Relatórios" : "Categorias";

  const navItems: { key: PageKey; icon: string; label: string }[] = [
    { key: "dash", icon: "fa-chart-pie", label: "Dashboard" },
    { key: "tx", icon: "fa-receipt", label: "Lançamentos" },
    { key: "reports", icon: "fa-file-export", label: "Relatórios" },
  ];

  return (
    <div className={`app-layout ${isPrinting ? "print-mode" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>💰 Financeiro Casal</h1>
          <div className="sub">Controle financeiro pessoal</div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(n => (
            <button
              key={n.key}
              className={`nav-item ${page === n.key ? "active" : ""}`}
              onClick={() => setPage(n.key)}
            >
              <i className={`fa-solid ${n.icon}`} />
              {n.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-item" onClick={() => setSettingsOpen(!settingsOpen)}>
            <i className="fa-solid fa-gear" />
            Opções
          </button>
        </div>
      </aside>

      {/* Settings popup */}
      {settingsOpen && (
        <div className="settings-popup">
          <button className="settings-item" onClick={() => { toggleTheme(); setSettingsOpen(false); }}>
            <i className={`fa-solid ${theme === "dark" ? "fa-sun" : "fa-moon"}`} />
            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
          </button>
          <button className="settings-item" onClick={() => setSettingsOpen(false)}>
            <i className="fa-solid fa-info-circle" />
            Versão 1.0
          </button>
          <button className="settings-item" onClick={() => { setSettingsOpen(false); setPage("cat"); }}>
            <i className="fa-solid fa-tags" />
            Gerenciar Categorias
          </button>
        </div>
      )}

      {/* Click outside to close settings */}
      {settingsOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 24 }}
          onClick={() => setSettingsOpen(false)}
        />
      )}

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-header" style={{ display: isPrinting ? "none" : "flex" }}>
          <h2>{pageTitle}</h2>
          <div className="page-header-right">
            {page !== "reports" && (
              <MonthPicker
                monthKey={monthKey}
                months={months}
                onChange={(m) => setMonthKey(m)}
                onPrev={onPrev}
                onNext={onNext}
              />
            )}
            <button className="btn primary" onClick={() => { setEditing(null); setTxModalOpen(true); }}>
              <i className="fa-solid fa-plus" /> Novo lançamento
            </button>
          </div>
        </div>

        {/* Global Filter Warning Banner */}
        {!isPrinting && page !== "reports" && (filters.type !== "all" || filters.categoryId !== "all" || filters.involves !== "all" || filters.paidBy !== "all" || filters.q.trim() !== "") && (
          <div style={{
            background: "var(--warning-bg, #fff3cd)",
            color: "var(--warning-text, #856404)",
            padding: "10px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "14px",
            fontWeight: 500,
            border: "1px solid var(--warning-border, #ffeeba)"
          }}>
            <div>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: 8 }} />
              Você está visualizando dados parciais porque um ou mais filtros estão ativos. Transações automáticas foram ocultadas.
            </div>
            <button
              onClick={() => setFilters({ type: "all", categoryId: "all", involves: "all", paidBy: "all", q: "" })}
              style={{
                background: "transparent", border: "none", color: "inherit", fontWeight: 700, cursor: "pointer", textDecoration: "underline"
              }}
            >
              Limpar Filtros
            </button>
          </div>
        )}

        {/* ── Dashboard ── */}
        {page === "dash" && (
          <>
            <KpiRow income={totals.income} expense={totals.expense} transfer={totals.transfer} withdraw={totals.withdraw} carryOver={carryOver} />

            <CoupleBreakdown data={coupleData} />

            {/* Quick add */}
            <div
              className={`quick-add-toggle ${quickAddOpen ? "open" : ""}`}
              onClick={() => setQuickAddOpen(!quickAddOpen)}
            >
              <i className="fa-solid fa-plus" />
              Lançamento rápido
            </div>
            <div className={`quick-add-panel ${quickAddOpen ? "open" : ""}`}>
              <div className="card">
                <div className="bd">
                  <TxForm
                    compact
                    categories={categories.filter(c => !c.archived)}
                    defaultMonthKey={monthKey}
                    activeReserves={activeReserves}
                    editing={null}
                    onSave={(data) => handleSaveTx(data, { keepTab: true })}
                    onCancelEdit={() => { }}
                    onSaved={() => setQuickAddOpen(false)}
                  />
                </div>
              </div>
            </div>

            {/* Filters */}
            <QuickFilters
              categories={categories.filter(c => !c.archived)}
              filters={filters}
              onChange={setFilters}
            />

            {/* Charts row */}
            <div className="grid-2" style={{ marginBottom: 16 }}>
              <PieChart categories={categories} items={visibleItems} />
              <BarChart allTransactions={allTx} currentMonthKey={monthKey} />
            </div>

            {/* Summary + Recent */}
            <div className="grid">
              <CategorySummary categories={categories} items={visibleItems} />
              <RecentTxList
                categories={categories.filter(c => !c.archived)}
                items={visibleItems.filter(tx => !tx.isAuto)}
                onAdd={() => { setEditing(null); setTxModalOpen(true); }}
              />
            </div>
          </>
        )}

        {/* ── Reports ── */}
        {page === "reports" && (
          <ReportPage
            allTx={allTx}
            categories={categories}
            availableMonths={months}
            onSetIsPrinting={setIsPrinting}
          />
        )}

        {/* ── Lançamentos ── */}
        {page === "tx" && (
          <div className="grid">
            <TxTable
              categories={categories}
              items={visibleItems}
              onEdit={(tx) => { setEditing(tx); setTxModalOpen(true); }}
              onDelete={handleDeleteTx}
              onReorder={async (ids) => { await reorderTransactions(ids); await refreshMonthData(monthKey); }}
            />
            <div style={{ display: "grid", gap: 14 }}>
              <QuickFilters
                categories={categories.filter(c => !c.archived)}
                filters={filters}
                onChange={setFilters}
              />
              <div className="card">
                <div className="hd">
                  <div>
                    <div className="ttl">Novo lançamento</div>
                    <div className="hint">Preencha e salve diretamente.</div>
                  </div>
                </div>
                <div className="bd">
                  <TxForm
                    categories={categories.filter(c => !c.archived)}
                    defaultMonthKey={monthKey}
                    activeReserves={activeReserves}
                    editing={null}
                    onSave={(data) => handleSaveTx(data)}
                    onCancelEdit={() => { }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Categorias ── */}
        {page === "cat" && (
          <CategoryManager
            categories={categories}
            onAdd={handleAddCategory}
            onArchive={handleArchiveCategory}
            onUnarchive={handleUnarchiveCategory}
          />
        )}
      </main>

      <Modal
        open={txModalOpen}
        title={editing ? "Editar lançamento" : "Adicionar lançamento"}
        onClose={() => { setTxModalOpen(false); setEditing(null); }}
      >
        <TxForm
          compact
          categories={categories.filter(c => !c.archived)}
          defaultMonthKey={monthKey}
          activeReserves={activeReserves}
          editing={editing}
          onSave={(data) => handleSaveTx(data, { keepTab: true })}
          onCancelEdit={() => setEditing(null)}
          onSaved={() => { setTxModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <Toast toast={toastState} onClose={() => setToastState(null)} />
    </div>
  );
}
