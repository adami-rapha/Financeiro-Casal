import React from "react";
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
    const pctBoth = data.totalExp > 0 ? ((data.bothExp / data.totalExp) * 100).toFixed(0) : "0";
    const pctMe = data.totalExp > 0 ? ((data.meExp / data.totalExp) * 100).toFixed(0) : "0";
    const pctHer = data.totalExp > 0 ? ((data.herExp / data.totalExp) * 100).toFixed(0) : "0";

    return (
        <div className="couple-grid">
            <div className="couple-card both">
                <div className="couple-icon">
                    <i className="fa-solid fa-heart" />
                </div>
                <div className="couple-label">Gastos do Casal</div>
                <div className="couple-value">{fmtBRL.format(data.bothExp)}</div>
                <div className="couple-detail">
                    <span><i className="fa-solid fa-chart-pie" /> {pctBoth}% do total</span>
                    <span><i className="fa-solid fa-arrow-down" /> +{fmtBRL.format(data.bothInc)}</span>
                </div>
            </div>

            <div className="couple-card me">
                <div className="couple-icon">
                    <i className="fa-solid fa-user" />
                </div>
                <div className="couple-label">Meus Gastos</div>
                <div className="couple-value">{fmtBRL.format(data.meExp)}</div>
                <div className="couple-detail">
                    <span><i className="fa-solid fa-chart-pie" /> {pctMe}% do total</span>
                    <span><i className="fa-solid fa-arrow-down" /> +{fmtBRL.format(data.meInc)}</span>
                </div>
            </div>

            <div className="couple-card her">
                <div className="couple-icon">
                    <i className="fa-solid fa-user" />
                </div>
                <div className="couple-label">Gastos Dela</div>
                <div className="couple-value">{fmtBRL.format(data.herExp)}</div>
                <div className="couple-detail">
                    <span><i className="fa-solid fa-chart-pie" /> {pctHer}% do total</span>
                    <span><i className="fa-solid fa-arrow-down" /> +{fmtBRL.format(data.herInc)}</span>
                </div>
            </div>
        </div>
    );
}
