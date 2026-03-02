import React from "react";
import type { Transaction, Category } from "../lib/types";
import { fmtBRL, monthLabel } from "../lib/utils";
import QuickFilters, { type Filters } from "./QuickFilters";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeCarryOver } from "../lib/carryOver";

type ExportFormat = "csv" | "txt" | "md" | "pdf";

interface Props {
    allTx: Transaction[];
    categories: Category[];
    availableMonths: string[];
    onSetIsPrinting: (val: boolean) => void;
}

export default function ReportPage({ allTx, categories, availableMonths, onSetIsPrinting }: Props) {
    const [selectedMonths, setSelectedMonths] = React.useState<Set<string>>(new Set(availableMonths));
    const [format, setFormat] = React.useState<ExportFormat>("md");

    const [filters, setFilters] = React.useState<Filters>({
        type: "all", categoryId: "all", involves: "all", paidBy: "all", q: ""
    });

    const catMap = new Map(categories.map(c => [c.id, c.name]));

    // Derived filtered items based on selected months AND selected filters
    const reportItems = React.useMemo(() => {
        const base = allTx.filter(tx => {
            if (!selectedMonths.has(tx.monthKey)) return false;
            // Never export phantom auto entries (they will be re-generated below if needed)
            if (tx.isAuto) return false;

            if (filters.type !== "all" && tx.type !== filters.type) return false;
            if (filters.categoryId !== "all" && (tx.categoryId ?? "") !== filters.categoryId) return false;
            if (filters.involves !== "all" && tx.involves !== filters.involves) return false;
            if (filters.paidBy !== "all" && tx.paidBy !== filters.paidBy) return false;
            if (filters.q.trim()) {
                if (!tx.description.toLowerCase().includes(filters.q.trim().toLowerCase())) return false;
            }
            return true;
        });

        // Add auto-withdrawals for selected months
        const autos: Transaction[] = [];
        const hasFilters = filters.type !== "all" || filters.categoryId !== "all" || filters.involves !== "all" || filters.paidBy !== "all" || filters.q.trim() !== "";

        // Only add autos if no specific filters are active (consistent with App.tsx behavior)
        if (!hasFilters) {
            selectedMonths.forEach(mk => {
                const { autoWithdrawals } = computeCarryOver(allTx, mk);
                autoWithdrawals.forEach((reserve, i) => {
                    autos.push({
                        id: `auto-withdraw-${reserve.id}-${mk}`,
                        date: `${mk}-01`,
                        monthKey: mk,
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
            });
        }

        return [...base, ...autos].sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const weights: Record<string, number> = { income: 0, transfer: 1, "reserve-withdraw": 2, expense: 3 };
            const wA = weights[a.type] ?? 3;
            const wB = weights[b.type] ?? 3;
            if (wA !== wB) return wA - wB;
            return b.amount - a.amount;
        });
    }, [allTx, selectedMonths, filters]);

    function toggleMonth(m: string) {
        const next = new Set(selectedMonths);
        if (next.has(m)) next.delete(m);
        else next.add(m);
        setSelectedMonths(next);
    }

    function handleExport(e?: React.MouseEvent) {
        if (e) e.preventDefault();

        if (reportItems.length === 0) {
            alert("Nenhum dado selecionado para exportar.");
            return;
        }

        if (format === "pdf") {
            try {
                const doc = new jsPDF();

                // Título do Relatório
                doc.setFontSize(22);
                doc.setTextColor(33, 37, 41);
                doc.text("Relatório Financeiro", 14, 22);

                doc.setFontSize(10);
                doc.setTextColor(110, 110, 110);
                doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, 30);
                doc.text(`Registros filtrados: ${reportItems.length}`, 14, 35);

                const tableRows = reportItems.map(t => {
                    const catN = t.categoryId ? catMap.get(t.categoryId) || "—" : "—";
                    const tLabel = t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : t.type === "reserve-withdraw" ? "Resgate" : "Reserva";
                    const sign = t.type === "expense" ? "-" : t.type === "income" || t.type === "reserve-withdraw" ? "+" : "";
                    const val = `${sign} ${fmtBRL.format(t.amount)}`;
                    return [
                        t.date.split("-").reverse().join("/"),
                        tLabel,
                        t.description,
                        catN,
                        val
                    ];
                });

                autoTable(doc, {
                    startY: 45,
                    head: [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor (R$)']],
                    body: tableRows,
                    theme: 'striped',
                    headStyles: { fillColor: [44, 62, 80], textColor: 255, fontStyle: 'bold' },
                    margin: { top: 45 },
                    styles: { fontSize: 9, cellPadding: 4 },
                    columnStyles: {
                        4: { halign: 'right', fontStyle: 'bold' }
                    },
                    didParseCell: (data: any) => {
                        if (data.section === 'body' && data.column.index === 4) {
                            const val = data.cell.raw as string;
                            if (val.startsWith('-')) data.cell.styles.textColor = [192, 0, 0];
                            else if (val.startsWith('+')) data.cell.styles.textColor = [0, 128, 0];
                        }
                    }
                });

                doc.save(`Relatorio_${new Date().toISOString().split('T')[0]}.pdf`);
                console.log("PDF gerado via AutoTable.");
            } catch (err) {
                console.error("Erro na geração de PDF AutoTable:", err);
                alert("Erro ao gerar PDF: " + (err as Error).message);
            }
            return;
        }

        let content = "";
        let mimeType = "text/plain";
        let ext = format;

        if (format === "csv") {
            mimeType = "text/csv;charset=utf-8;";
            // Add UTF-8 BOM so Excel opens with correct encoding
            content = "\ufeff";
            content += `Data;Tipo;Descrição;Categoria;Valor;Pago Por;Envolve\n`;

            for (const t of reportItems) {
                const typeL = t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : t.type === "reserve-withdraw" ? "Resgate" : "Reserva";
                const catN = t.categoryId ? catMap.get(t.categoryId) || "" : "";
                const amt = t.amount.toString().replace(".", ",");
                const paidL = t.paidBy === "me" ? "Eu" : "Ela";
                const invL = t.involves === "both" ? "Casal" : t.involves === "me" ? "Eu" : "Ela";
                // Clean descriptions to not break CSV
                const desc = t.description.replace(/;/g, ",").replace(/"/g, "'");

                content += `${t.date};${typeL};${desc};${catN};${amt};${paidL};${invL}\n`;
            }
        }
        else if (format === "txt") {
            content += `RELATÓRIO FINANCEIRO\nData de Geração: ${new Date().toLocaleString()}\n`;
            content += `=========================================\n\n`;
            let total = 0;
            for (const t of reportItems) {
                const typeL = t.type === "income" ? "+" : t.type === "expense" ? "-" : "R";
                const catN = t.categoryId ? catMap.get(t.categoryId) || "-" : "-";
                const amt = t.type === "expense" ? -t.amount : t.amount;
                if (t.type !== "transfer" && t.type !== "reserve-withdraw") total += amt;

                content += `[${t.date}] ${typeL} R$ ${t.amount.toFixed(2)} | ${t.description.padEnd(25)} | Cat: ${catN}\n`;
            }
            content += `\n=========================================\n`;
            content += `BALANÇO TOTAL LÍQUIDO (Filtrado): R$ ${total.toFixed(2)}\n`;
        }
        else if (format === "md") {
            // Markdown formatted
            content = `# Relatório Financeiro: Casal\n\n`;
            content += `> Gerado em: ${new Date().toLocaleString()}\n\n`;

            const txByMonth = new Map<string, Transaction[]>();
            reportItems.forEach(tx => {
                if (!txByMonth.has(tx.monthKey)) txByMonth.set(tx.monthKey, []);
                txByMonth.get(tx.monthKey)!.push(tx);
            });
            const sortedMonths = Array.from(txByMonth.keys()).sort((a, b) => b.localeCompare(a));

            for (const m of sortedMonths) {
                content += `### Mês: ${m}\n\n`;
                const txs = txByMonth.get(m)!;

                let inc = 0, exp = 0, tr = 0, rw = 0;
                let pMe = 0, pHer = 0;
                let cBoth = 0, cMe = 0, cHer = 0;

                txs.forEach(t => {
                    if (t.type === "income") inc += t.amount;
                    else if (t.type === "expense") exp += t.amount;
                    else if (t.type === "reserve-withdraw") rw += t.amount;
                    else tr += t.amount;

                    if (t.type === "expense") {
                        if (t.paidBy === "me") pMe += t.amount; else pHer += t.amount;
                        if (t.involves === "both") cBoth += t.amount;
                        else if (t.involves === "me") cMe += t.amount;
                        else cHer += t.amount;
                    }
                });

                content += `**Balanço do Mês**:\n`;
                content += `- Entradas: R$ ${inc.toFixed(2)}\n`;
                content += `- Saídas: R$ ${exp.toFixed(2)}\n`;
                content += `- Reservas: R$ ${tr.toFixed(2)}\n`;
                if (rw > 0) content += `- Resgates de Reserva: R$ ${rw.toFixed(2)}\n`;
                content += `\n`;

                content += `**Despesas**:\n`;
                content += `- Casal: R$ ${cBoth.toFixed(2)}\n`;
                content += `- Apenas Ele: R$ ${cMe.toFixed(2)}\n`;
                content += `- Apenas Ela: R$ ${cHer.toFixed(2)}\n\n`;

                content += `**Lista de Lançamentos (${m})**:\n`;
                content += `| Data | Tipo | Descrição | Categoria | Valor | Pago por | Envolve |\n`;
                content += `|---|---|---|---|---|---|---|\n`;

                txs.forEach(t => {
                    const catName = t.categoryId ? catMap.get(t.categoryId) || "—" : "—";
                    const typeLabel = t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : t.type === "reserve-withdraw" ? "Resgate" : "Reserva";
                    const paidLabel = t.paidBy === "me" ? "Ele" : "Ela";
                    const invLabel = t.involves === "both" ? "Casal" : t.involves === "me" ? "Ele" : "Ela";
                    content += `| ${t.date} | ${typeLabel} | ${t.description} | ${catName} | R$ ${t.amount.toFixed(2)} | ${paidLabel} | ${invLabel} |\n`;
                });
                content += `\n---\n\n`;
            }
        }

        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Relatorio_${new Date().toISOString().split('T')[0]}.${ext}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // To build the Print View visually for the DOM
    function renderPrintView() {
        return (
            <div id="report-pdf-content-inner" style={{
                background: '#ffffff',
                color: '#000000',
                padding: '40px',
                width: '1000px',
                minHeight: '1000px',
                boxSizing: 'border-box',
                fontFamily: 'Arial, sans-serif',
                position: 'relative'
            }}>
                <div style={{ borderBottom: '3px solid #000', marginBottom: '20px', paddingBottom: '10px' }}>
                    <h1 style={{ color: '#000000', margin: 0, fontSize: '28px' }}>Relatório Financeiro</h1>
                    <p style={{ color: '#666666', fontSize: '14px', margin: '5px 0' }}>Gerado em: {new Date().toLocaleString()}</p>
                    <p style={{ color: '#666666', fontSize: '14px', margin: '5px 0' }}>Registros filtrados: {reportItems.length}</p>
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px", color: '#000000', border: '1px solid #000' }}>
                    <thead>
                        <tr style={{ background: '#f0f0f0' }}>
                            <th style={{ textAlign: "left", border: "1px solid #000", padding: "12px", fontSize: '14px' }}>Data</th>
                            <th style={{ textAlign: "left", border: "1px solid #000", padding: "12px", fontSize: '14px' }}>Tipo</th>
                            <th style={{ textAlign: "left", border: "1px solid #000", padding: "12px", fontSize: '14px' }}>Descrição</th>
                            <th style={{ textAlign: "left", border: "1px solid #000", padding: "12px", fontSize: '14px' }}>Categoria</th>
                            <th style={{ textAlign: "right", border: "1px solid #000", padding: "12px", fontSize: '14px' }}>Valor (R$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reportItems.map(t => {
                            const catN = t.categoryId ? catMap.get(t.categoryId) || "—" : "—";
                            const tLabel = t.type === "income" ? "Entrada" : t.type === "expense" ? "Saída" : t.type === "reserve-withdraw" ? "Resgate" : "Reserva";
                            const sign = t.type === "expense" ? "-" : t.type === "income" || t.type === "reserve-withdraw" ? "+" : "";
                            const color = t.type === "expense" ? "#d32f2f" : t.type === "income" || t.type === "reserve-withdraw" ? "#388e3c" : "#000000";
                            return (
                                <tr key={t.id}>
                                    <td style={{ border: "1px solid #ddd", padding: "10px", fontSize: '13px' }}>{t.date.split("-").reverse().join("/")}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "10px", fontSize: '13px' }}>{tLabel}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "10px", fontSize: '13px' }}>{t.description}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "10px", fontSize: '13px' }}>{catN}</td>
                                    <td style={{ border: "1px solid #ddd", padding: "10px", textAlign: "right", fontSize: '13px', fontWeight: 'bold', color: color }}>{sign} {fmtBRL.format(t.amount)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
                <div style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '10px', textAlign: 'right', fontSize: '12px', color: '#999' }}>
                    Documento gerado pelo Sistema Financeiro Casal
                </div>
            </div>
        );
    }

    return (
        <div className="report-page card" style={{ padding: 24, paddingBottom: 60 }}>
            {/* Secret print view elements that are only visible when printing/exporting */}
            <div className="print-only" id="report-pdf-content" style={{ background: '#fff', color: '#000' }}>
                {renderPrintView()}
            </div>

            <div className="no-print">
                <h3 style={{ marginBottom: 16 }}>Configurar Relatório</h3>

                {/* Months selection */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>1. Selecione os Meses</label>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {availableMonths.map(m => (
                            <label key={m} className="check-card">
                                <input
                                    type="checkbox"
                                    checked={selectedMonths.has(m)}
                                    onChange={() => toggleMonth(m)}
                                />
                                {selectedMonths.has(m) ? <i className="fa-solid fa-check" /> : null}
                                <span style={{ whiteSpace: "nowrap" }}>{monthLabel(m)}</span>
                            </label>
                        ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button
                            className="btn soft"
                            onClick={() => setSelectedMonths(new Set(availableMonths))}
                        >
                            Selecionar Todos
                        </button>
                        <button
                            className="btn soft"
                            onClick={() => setSelectedMonths(new Set())}
                        >
                            Limpar Tudo
                        </button>
                    </div>
                </div>

                {/* Filters selection */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>2. Aplicar Filtros (Opcional)</label>
                    <QuickFilters
                        categories={categories}
                        filters={filters}
                        onChange={setFilters}
                    />
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8 }}>
                        Total de lançamentos englobados nestes filtros: <strong>{reportItems.length}</strong>
                    </div>
                </div>

                {/* Format Selection */}
                <div style={{ marginBottom: 24 }}>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>3. Formato do Arquivo</label>
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                        <label className="radio-card">
                            <input type="radio" name="fmt" value="md" checked={format === "md"} onChange={() => setFormat("md")} />
                            <i className="fa-brands fa-markdown" style={{ color: "var(--info)", fontSize: 16 }} /> Markdown (IA)
                        </label>
                        <label className="radio-card">
                            <input type="radio" name="fmt" value="csv" checked={format === "csv"} onChange={() => setFormat("csv")} />
                            <i className="fa-solid fa-file-excel" style={{ color: "var(--income)", fontSize: 16 }} /> Excel (CSV)
                        </label>
                        <label className="radio-card">
                            <input type="radio" name="fmt" value="pdf" checked={format === "pdf"} onChange={() => setFormat("pdf")} />
                            <i className="fa-solid fa-file-pdf" style={{ color: "var(--expense)", fontSize: 16 }} /> Documento (PDF)
                        </label>
                        <label className="radio-card">
                            <input type="radio" name="fmt" value="txt" checked={format === "txt"} onChange={() => setFormat("txt")} />
                            <i className="fa-solid fa-file-lines" style={{ color: "var(--text-muted)", fontSize: 16 }} /> Texto Simples (TXT)
                        </label>
                    </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                    <button type="button" className="btn primary" onClick={handleExport} style={{ padding: "12px 24px", fontSize: 16 }}>
                        <i className="fa-solid fa-download" style={{ marginRight: 8 }} />
                        Baixar Relatório
                    </button>
                </div>
            </div>
        </div>
    );
}
