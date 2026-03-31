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
import ImportExportPage from "./components/ImportExportPage";
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

type PageKey = "dash" | "tx" | "cat" | "reports" | "importexport";

function uniqueSortedMonths(existing: string[], include: string): string[] {
  const set = new Set(existing);
  set.add(include);
  return Array.from(set).sort();
}


export default function App() {
  const { theme, toggle: toggleTheme } = useTheme();
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  const [page, setPage] = React.useState<PageKey>("dash");
  const [viewMode, setViewMode] = React.useState<"couple" | "person1" | "person2">("couple");

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
        if (tx.involves === "both") {
          bothExp += tx.amount;
          meExp += tx.amount / 2;
          herExp += tx.amount / 2;
        }
        else if (tx.involves === "me") meExp += tx.amount;
        else herExp += tx.amount;
      } else if (tx.type === "income") {
        if (tx.involves === "both") {
          bothInc += tx.amount;
          meInc += tx.amount / 2;
          herInc += tx.amount / 2;
        }
        else if (tx.involves === "me") meInc += tx.amount;
        else herInc += tx.amount;
      }
    }
    return { bothExp, meExp, herExp, bothInc, meInc, herInc, totalExp: meExp + herExp };
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


  const pageTitle =
    page === "dash" ? "Visão Geral" :
      page === "tx" ? "Lançamentos" :
        page === "reports" ? "Relatórios" :
          page === "importexport" ? "Importar / Exportar" : "Categorias";

  const navItems: { key: PageKey; icon: string; label: string }[] = [
    { key: "dash", icon: "fa-chart-pie", label: "Visão Geral" },
    { key: "tx", icon: "fa-receipt", label: "Lançamentos" },
    { key: "reports", icon: "fa-file-export", label: "Relatórios" },
    { key: "importexport", icon: "fa-arrow-right-arrow-left", label: "Importar / Exportar" },
  ];

  return (
    <div className={`app-layout ${isPrinting ? "print-mode" : ""}`}>
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-top">
            <img src="./img/logo.png" alt="Logo" className="brand-logo" />
            <div className="brand-titles">
              <h1 className="brand-title">Financeiro</h1>
              <h1 className="brand-title brand-title-accent">Casal</h1>
            </div>
          </div>
          <div className="sub">Planejamento e união financeira</div>
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
        {!isPrinting && page !== "reports" && (
          <div className="top-bar">
            {/* Left side: Mode Toggle */}
            <div className="top-bar-left">
              <div className="mode-toggle-wrapper">
                <span className="mode-toggle-label">
                  MODO<br />
                  <strong>
                    {viewMode === "couple" ? "CASAL" : viewMode === "person1" ? "ELE" : "ELA"}
                  </strong>
                </span>
                <div className="mode-toggle-switch">
                  <div
                    className={`mode-toggle-indicator ${viewMode}`}
                  ></div>
                  <button
                    className={`mode-btn ${viewMode === 'person1' ? 'active' : ''}`}
                    onClick={() => setViewMode('person1')}
                    title="Modo Individual (Pessoa 1)"
                  >
                    <i className="fa-solid fa-user mode-icon-m"></i>
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'couple' ? 'active' : ''}`}
                    onClick={() => setViewMode('couple')}
                    title="Modo Casal"
                  >
                    <div className="couple-icons">
                      <i className="fa-solid fa-user mode-icon-m"></i>
                      <i className="fa-solid fa-user mode-icon-f" style={{ marginLeft: '-6px' }}></i>
                    </div>
                  </button>
                  <button
                    className={`mode-btn ${viewMode === 'person2' ? 'active' : ''}`}
                    onClick={() => setViewMode('person2')}
                    title="Modo Individual (Pessoa 2)"
                  >
                    <i className="fa-solid fa-user mode-icon-f"></i>
                  </button>
                </div>

                <button
                  className="quick-add-btn"
                  onClick={() => setTxModalOpen(true)}
                  title="Novo Lançamento"
                >
                  <i className="fa-solid fa-plus icon"></i>
                  <span className="text">Lançamento Rápido</span>
                </button>
              </div>
            </div>

            {/* Center: MonthPicker */}
            <div className="top-bar-center">
              <MonthPicker
                monthKey={monthKey}
                months={months}
                onChange={(m) => setMonthKey(m)}
              />
            </div>

            {/* Right side: Theme Toggle, Notifications & Profile */}
            <div className="top-bar-right">

              {/* Theme Toggle Switch */}
              <div className="theme-toggle-switch" onClick={toggleTheme} title="Alternar Tema">
                <div
                  className="theme-indicator"
                  style={{ transform: theme === 'dark' ? 'translateX(0)' : 'translateX(100%)' }}
                />
                <div className={`theme-btn ${theme === 'dark' ? 'active' : ''}`}>
                  <i className="fa-solid fa-moon"></i>
                </div>
                <div className={`theme-btn ${theme === 'light' ? 'active' : ''}`}>
                  <i className="fa-solid fa-sun"></i>
                </div>
              </div>

              <div className="notification-wrapper">
                <button
                  className="icon-btn icon-lg"
                  title="Notificações"
                  onClick={() => {
                    const el = document.getElementById('notif-dropdown');
                    if (el) el.classList.toggle('open');
                  }}
                >
                  <i className="fa-regular fa-bell" />
                  <span className="notification-badge"></span>
                </button>

                <div id="notif-dropdown" className="notification-dropdown">
                  <div className="notif-header">
                    <h4>Notificações</h4>
                    <button
                      className="notif-close-btn"
                      onClick={() => {
                        const el = document.getElementById('notif-dropdown');
                        if (el) el.classList.remove('open');
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div className="notif-body">
                    <div className="notif-item unread">
                      <div className="notif-icon bg-income-muted text-income">
                        <i className="fa-solid fa-arrow-down" />
                      </div>
                      <div className="notif-content">
                        <p className="notif-title">Salário recebido</p>
                        <p className="notif-desc">Seu salário de R$ 5.000,00 foi compensado.</p>
                        <span className="notif-time">Há 2 horas</span>
                      </div>
                    </div>
                    <div className="notif-item">
                      <div className="notif-icon bg-expense-muted text-expense">
                        <i className="fa-solid fa-file-invoice-dollar" />
                      </div>
                      <div className="notif-content">
                        <p className="notif-title">Conta vencendo</p>
                        <p className="notif-desc">A conta de Luz vence amanhã.</p>
                        <span className="notif-time">Ontem</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-wrapper" style={{ position: 'relative' }}>
                <div
                  className="profile-btn"
                  title="Trocar Perfil ou Ver Opções"
                >
                  <div className="profile-stack" key={viewMode}>
                    {/* Layer `pos-2` = lowest layer. Layer `pos-1` = middle layer. Layer `active` = front layer */}
                    <div
                      className={`profile-avatar stack-item ${viewMode === 'couple' ? 'active' : 'inactive'} ${viewMode === 'person1' ? 'pos-1' : viewMode === 'person2' ? 'pos-2' : ''}`}
                      onClick={() => {
                        if (viewMode === 'couple') {
                          const el = document.getElementById('profile-dropdown');
                          if (el) el.classList.toggle('open');
                        } else {
                          setViewMode('couple');
                        }
                      }}
                    >
                      <div className="profile-hover-overlay">
                        <i className={`fa-solid ${viewMode === 'couple' ? 'fa-gear' : 'fa-rotate-right'}`}></i>
                      </div>
                      <div className="couple-icons">
                        <i className="fa-solid fa-user" style={{ fontSize: '16px' }}></i>
                        <i className="fa-solid fa-user" style={{ marginLeft: '-6px', fontSize: '16px' }}></i>
                      </div>
                    </div>
                    <div
                      className={`profile-avatar stack-item person1 ${viewMode === 'person1' ? 'active' : 'inactive'} ${viewMode === 'person2' ? 'pos-1' : viewMode === 'couple' ? 'pos-2' : ''}`}
                      onClick={() => {
                        if (viewMode === 'person1') {
                          const el = document.getElementById('profile-dropdown');
                          if (el) el.classList.toggle('open');
                        } else {
                          setViewMode('person1');
                        }
                      }}
                    >
                      <div className="profile-hover-overlay">
                        <i className={`fa-solid ${viewMode === 'person1' ? 'fa-gear' : 'fa-rotate-right'}`}></i>
                      </div>
                      <i className="fa-solid fa-user"></i>
                    </div>
                    <div
                      className={`profile-avatar stack-item person2 ${viewMode === 'person2' ? 'active' : 'inactive'} ${viewMode === 'couple' ? 'pos-1' : viewMode === 'person1' ? 'pos-2' : ''}`}
                      onClick={() => {
                        if (viewMode === 'person2') {
                          const el = document.getElementById('profile-dropdown');
                          if (el) el.classList.toggle('open');
                        } else {
                          setViewMode('person2');
                        }
                      }}
                    >
                      <div className="profile-hover-overlay">
                        <i className={`fa-solid ${viewMode === 'person2' ? 'fa-gear' : 'fa-rotate-right'}`}></i>
                      </div>
                      <i className="fa-solid fa-user"></i>
                    </div>
                  </div>
                </div>

                {/* Profile Settings Dropdown */}
                <div id="profile-dropdown" className="notification-dropdown profile-dropdown">
                  <div className="notif-header">
                    <h4>Configurações de Usuário</h4>
                    <button
                      className="notif-close-btn"
                      onClick={() => {
                        const el = document.getElementById('profile-dropdown');
                        if (el) el.classList.remove('open');
                      }}
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                  <div className="notif-body">
                    <div className="profile-menu-item">
                      <i className="fa-solid fa-gear"></i>
                      <span>Ajustes do Perfil</span>
                    </div>
                    <div className="profile-menu-item">
                      <i className="fa-solid fa-key"></i>
                      <span>Segurança</span>
                    </div>
                    <div className="profile-menu-item" style={{ color: 'var(--expense)' }}>
                      <i className="fa-solid fa-right-from-bracket"></i>
                      <span>Sair desta conta</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

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

        {/* ── Importar / Exportar ── */}
        {page === "importexport" && (
          <ImportExportPage
            onRefresh={refreshAll}
            toast={toast}
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
