import React, { useEffect, useState } from "react";
import { fmtBRL } from "../lib/utils";

type Props = {
    data: {
        bothExp: number;
        meExp: number;
        herExp: number;
        bothInc: number;
        meInc: number;
        herInc: number;
        totalExp: number;
    };
};

export default function CoupleBreakdown({ data }: Props) {
    const [mounted, setMounted] = useState(false);
    useEffect(() => { setMounted(true); }, []);

    const total = data.totalExp;

    // As percentages of the total expenses
    const rawPctMe = total > 0 ? Math.min(100, (data.meExp / total) * 100) : 0;
    const rawPctBoth = total > 0 ? Math.min(100, (data.bothExp / total) * 100) : 0;
    const rawPctHer = total > 0 ? Math.min(100, (data.herExp / total) * 100) : 0;

    // Offsets for the stroke-dashoffset (100 = empty, 0 = full)
    const offsetMe = mounted ? 100 - rawPctMe : 100;
    const offsetBoth = mounted ? 100 - rawPctBoth : 100;
    const offsetHer = mounted ? 100 - rawPctHer : 100;

    return (
        <div className="unified-couple-card ring-card">
            {/* Card Header */}
            <div className="ring-card-header">
                <div className="ring-card-header-left">
                    <span className="ring-card-title">Atividade Financeira</span>
                    <span className="ring-card-subtitle">Distribuição de gastos do mês</span>
                </div>
                <div className="ring-card-header-right">
                    <span className="ring-card-total-label">Total do mês</span>
                    <span className="ring-card-total-val">{fmtBRL.format(total)}</span>
                </div>
            </div>

            {/* Card Body */}
            <div className="ring-card-body">
                {/* Heart Chart */}
                <div className="rings-wrapper">
                    <svg viewBox="-10 -10 120 120" className="rings-svg">
                        <defs>
                            <linearGradient id="grad-me" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#4ade80" />
                                <stop offset="100%" stopColor="#15803d" />
                            </linearGradient>
                            <linearGradient id="grad-both" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#60a5fa" />
                                <stop offset="100%" stopColor="#1d4ed8" />
                            </linearGradient>
                            <linearGradient id="grad-her" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#fb7185" />
                                <stop offset="100%" stopColor="#be123c" />
                            </linearGradient>

                            <filter id="volumetric" x="-30%" y="-30%" width="160%" height="160%">
                                <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="rgba(0,0,0,0.3)" />
                                <feOffset dx="0" dy="1.5" />
                                <feGaussianBlur stdDeviation="1.5" result="offset-blur" />
                                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                                <feFlood floodColor="white" floodOpacity="0.3" result="color" />
                                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                            </filter>

                            <filter id="groove" x="-20%" y="-20%" width="140%" height="140%">
                                <feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="rgba(255,255,255,0.05)" />
                                <feOffset dx="0" dy="2" />
                                <feGaussianBlur stdDeviation="2" result="offset-blur" />
                                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                                <feFlood floodColor="black" floodOpacity="0.5" result="color" />
                                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
                            </filter>
                        </defs>

                        <path className="ring-bg" filter="url(#groove)" style={{ strokeWidth: 8 }} d="M 50 25 C 50 25 45 10 25 10 C 5 10 5 35 5 35 C 5 60 50 90 50 90 C 50 90 95 60 95 35 C 95 35 95 10 75 10 C 55 10 50 25 50 25 Z" />
                        <path className="ring-bg" filter="url(#groove)" style={{ strokeWidth: 8 }} d="M 50 30.6 C 50 30.6 46.4 19.8 32 19.8 C 17.6 19.8 17.6 37.8 17.6 37.8 C 17.6 55.8 50 77.4 50 77.4 C 50 77.4 82.4 55.8 82.4 37.8 C 82.4 37.8 82.4 19.8 68 19.8 C 53.6 19.8 50 30.6 50 30.6 Z" />
                        <path className="ring-bg" filter="url(#groove)" style={{ strokeWidth: 8 }} d="M 50 36.2 C 50 36.2 47.8 29.6 39 29.6 C 30.2 29.6 30.2 40.6 30.2 40.6 C 30.2 51.6 50 64.8 50 64.8 C 50 64.8 69.8 51.6 69.8 40.6 C 69.8 40.6 69.8 29.6 61 29.6 C 52.2 29.6 50 36.2 50 36.2 Z" />

                        <path className="ring-val both" filter="url(#volumetric)" stroke="url(#grad-me)" pathLength="100" strokeDasharray="100" strokeDashoffset={offsetBoth} style={{ strokeWidth: 8 }} d="M 50 25 C 50 25 45 10 25 10 C 5 10 5 35 5 35 C 5 60 50 90 50 90 C 50 90 95 60 95 35 C 95 35 95 10 75 10 C 55 10 50 25 50 25 Z" />
                        <path className="ring-val me" filter="url(#volumetric)" stroke="url(#grad-both)" pathLength="100" strokeDasharray="100" strokeDashoffset={offsetMe} style={{ strokeWidth: 8 }} d="M 50 30.6 C 50 30.6 46.4 19.8 32 19.8 C 17.6 19.8 17.6 37.8 17.6 37.8 C 17.6 55.8 50 77.4 50 77.4 C 50 77.4 82.4 55.8 82.4 37.8 C 82.4 37.8 82.4 19.8 68 19.8 C 53.6 19.8 50 30.6 50 30.6 Z" />
                        <path className="ring-val her" filter="url(#volumetric)" stroke="url(#grad-her)" pathLength="100" strokeDasharray="100" strokeDashoffset={offsetHer} style={{ strokeWidth: 8 }} d="M 50 36.2 C 50 36.2 47.8 29.6 39 29.6 C 30.2 29.6 30.2 40.6 30.2 40.6 C 30.2 51.6 50 64.8 50 64.8 C 50 64.8 69.8 51.6 69.8 40.6 C 69.8 40.6 69.8 29.6 61 29.6 C 52.2 29.6 50 36.2 50 36.2 Z" />
                    </svg>

                    <div className="rings-center-icon">
                        <i className="fa-solid fa-rings-wedding" style={{ fontSize: 20, background: "linear-gradient(135deg, #e2e8f0, #94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}></i>
                    </div>
                </div>

                {/* Stats Column */}
                <div className="ring-stats-col">
                    <div className="ring-stat-block green">
                        <div className="ring-stat-dot" style={{ background: "linear-gradient(135deg, #4ade80, #16a34a)" }}></div>
                        <div className="ring-stat-info">
                            <span className="ring-stat-label">Gastos do Casal</span>
                            <span className="ring-stat-hint">Dividido 50/50</span>
                        </div>
                        <span className="ring-stat-value">{fmtBRL.format(data.bothExp)}</span>
                    </div>

                    <div className="ring-stat-block blue">
                        <div className="ring-stat-dot" style={{ background: "linear-gradient(135deg, #3b82f6, #1d4ed8)" }}></div>
                        <div className="ring-stat-info">
                            <span className="ring-stat-label">Meus Gastos</span>
                            <span className="ring-stat-hint">Pessoal + ½ do casal</span>
                        </div>
                        <span className="ring-stat-value">{fmtBRL.format(data.meExp)}</span>
                    </div>

                    <div className="ring-stat-block pink">
                        <div className="ring-stat-dot" style={{ background: "linear-gradient(135deg, #fb7185, #e11d48)" }}></div>
                        <div className="ring-stat-info">
                            <span className="ring-stat-label">Gastos Dela</span>
                            <span className="ring-stat-hint">Pessoal + ½ do casal</span>
                        </div>
                        <span className="ring-stat-value">{fmtBRL.format(data.herExp)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
