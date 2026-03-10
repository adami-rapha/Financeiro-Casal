import React, { useRef, useEffect, useMemo } from "react";
import type { Transaction, Category } from "../lib/types";
import { fmtBRL } from "../lib/utils";

const CAT_COLORS = [
    "#6366f1", "#f87171", "#34d399", "#fbbf24", "#60a5fa",
    "#a78bfa", "#f472b6", "#fb923c", "#2dd4bf", "#e879f9",
    "#84cc16", "#38bdf8", "#fb7185", "#a3e635", "#c084fc",
];

function getComputedCssVar(name: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/* ═══════ PIE CHART ═══════ */
type PieProps = { categories: Category[]; items: Transaction[] };

export function PieChart({ categories, items }: PieProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const data = useMemo(() => {
        const map = new Map<string, number>();
        for (const tx of items) {
            if (tx.type !== "expense") continue;
            const key = tx.categoryId ?? "__none__";
            map.set(key, (map.get(key) ?? 0) + tx.amount);
        }
        const catById = new Map(categories.map(c => [c.id, c.name]));
        return Array.from(map.entries())
            .map(([k, v], i) => ({
                id: k,
                name: k === "__none__" ? "Sem categoria" : (catById.get(k) ?? "Removida"),
                amount: v,
                color: CAT_COLORS[i % CAT_COLORS.length],
            }))
            .sort((a, b) => b.amount - a.amount);
    }, [items, categories]);

    const total = data.reduce((a, b) => a + b.amount, 0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const textColor = getComputedCssVar("--chart-label") || "#f1f5f9";
        const mutedColor = getComputedCssVar("--chart-label-dim") || "#64748b";
        const emptyColor = getComputedCssVar("--chart-empty") || "rgba(255,255,255,.06)";

        const dpr = window.devicePixelRatio || 1;
        const size = 200;
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        canvas.style.width = `${size}px`;
        canvas.style.height = `${size}px`;
        ctx.scale(dpr, dpr);

        const cx = size / 2, cy = size / 2, r = 80, innerR = 50;
        ctx.clearRect(0, 0, size, size);

        if (total === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
            ctx.fillStyle = emptyColor;
            ctx.fill();
            ctx.font = "600 12px Inter, sans-serif";
            ctx.fillStyle = mutedColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Sem dados", cx, cy);
            return;
        }

        let startAngle = -Math.PI / 2;
        for (const d of data) {
            const sliceAngle = (d.amount / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
            ctx.arc(cx, cy, innerR, startAngle + sliceAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = d.color;
            ctx.fill();
            startAngle += sliceAngle;
        }

        ctx.font = "800 16px Inter, sans-serif";
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fmtBRL.format(total), cx, cy - 6);
        ctx.font = "600 10px Inter, sans-serif";
        ctx.fillStyle = mutedColor;
        ctx.fillText("Total saídas", cx, cy + 10);
    }, [data, total]);

    return (
        <div className="chart-card">
            <div className="chart-title">Gastos por Categoria</div>
            <div className="chart-subtitle">Distribuição das saídas do mês</div>
            <div style={{ display: "flex", gap: 16, alignItems: "center", flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }}>
                    <canvas ref={canvasRef} />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minWidth: 0 }}>
                    {data.slice(0, 8).map(d => {
                        const pct = total > 0 ? ((d.amount / total) * 100).toFixed(1) : "0";
                        return (
                            <div key={d.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                                <span style={{ width: 10, height: 10, borderRadius: 3, background: d.color, flexShrink: 0 }} />
                                <span style={{ flex: 1, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.name}</span>
                                <span style={{ fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap" }}>{pct}%</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

/* ═══════ BAR CHART ═══════ */
type BarProps = { allTransactions: Transaction[]; currentMonthKey: string };

export function BarChart({ allTransactions, currentMonthKey }: BarProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const months = useMemo(() => {
        const result: { key: string; label: string; income: number; expense: number }[] = [];
        const [y, m] = currentMonthKey.split("-").map(Number);
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        for (let i = 5; i >= 0; i--) {
            const d = new Date(y, m - 1 - i, 1);
            const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            result.push({ key: mk, label: monthNames[d.getMonth()], income: 0, expense: 0 });
        }

        for (const tx of allTransactions) {
            const entry = result.find(r => r.key === tx.monthKey);
            if (!entry) continue;
            if (tx.type === "income") entry.income += tx.amount;
            else if (tx.type === "expense") entry.expense += tx.amount;
        }

        return result;
    }, [allTransactions, currentMonthKey]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const textColor = getComputedCssVar("--chart-label") || "#f1f5f9";
        const mutedColor = getComputedCssVar("--chart-label-dim") || "#64748b";
        const gridColor = getComputedCssVar("--chart-grid") || "rgba(255,255,255,.05)";
        const incomeColor = getComputedCssVar("--income") || "#34d399";
        const incomeMutedColor = getComputedCssVar("--income-muted") || "rgba(52,211,153,.3)";
        const expenseColor = getComputedCssVar("--expense") || "#f87171";
        const expenseMutedColor = getComputedCssVar("--expense-muted") || "rgba(248,113,113,.3)";

        const dpr = window.devicePixelRatio || 1;
        const parentStyle = getComputedStyle(canvas.parentElement!);
        const paddingX = parseFloat(parentStyle.paddingLeft) + parseFloat(parentStyle.paddingRight);
        const w = (canvas.parentElement?.clientWidth ?? 400) - paddingX;
        const h = 200;
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.height = `${h}px`;
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        const maxVal = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)));
        const barW = 20;
        const gap = (w - 60) / months.length;
        const baseY = h - 30;
        const topPad = 16;
        const chartH = baseY - topPad;

        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = topPad + (chartH / 4) * i;
            ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(w - 10, y); ctx.stroke();
        }

        ctx.font = "500 10px Inter, sans-serif";
        ctx.fillStyle = mutedColor;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        for (let i = 0; i <= 4; i++) {
            const y = topPad + (chartH / 4) * i;
            const val = maxVal * (1 - i / 4);
            const label = val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0);
            ctx.fillText(label, 35, y);
        }

        months.forEach((m, i) => {
            const x = 50 + gap * i + gap / 2 - barW - 2;
            const incH = (m.income / maxVal) * chartH;
            const expH = (m.expense / maxVal) * chartH;

            const gradIn = ctx.createLinearGradient(0, baseY - incH, 0, baseY);
            gradIn.addColorStop(0, incomeColor);
            gradIn.addColorStop(1, incomeMutedColor);
            ctx.fillStyle = gradIn;
            roundedRect(ctx, x, baseY - incH, barW, incH, 4);

            const gradOut = ctx.createLinearGradient(0, baseY - expH, 0, baseY);
            gradOut.addColorStop(0, expenseColor);
            gradOut.addColorStop(1, expenseMutedColor);
            ctx.fillStyle = gradOut;
            roundedRect(ctx, x + barW + 4, baseY - expH, barW, expH, 4);

            ctx.font = "600 11px Inter, sans-serif";
            ctx.fillStyle = m.key === currentMonthKey ? textColor : mutedColor;
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(m.label, x + barW + 2, baseY + 6);
        });
    }, [months, currentMonthKey]);

    return (
        <div className="chart-card">
            <div className="chart-title">Histórico Mensal</div>
            <div className="chart-subtitle">
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 16 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--income)" }} /> Entradas
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--expense)" }} /> Saídas
                </span>
            </div>
            <canvas ref={canvasRef} style={{ width: "100%", display: "block" }} />
        </div>
    );
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (h < 1) return;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
}
