import React from "react";
import { fmtBRL } from "../lib/utils";
import type { CarryOverData } from "../lib/carryOver";

type Props = {
  income: number;
  expense: number;
  transfer: number;
  withdraw: number;
  carryOver: CarryOverData;
};

export default function KpiRow({ income, expense, transfer, withdraw, carryOver }: Props) {
  const currentNetBalance = income - expense - transfer + withdraw;
  const saldoDoMes = carryOver.previousBalance + currentNetBalance;
  const saldoTotal = saldoDoMes + carryOver.totalReserves;

  return (
    <>
      <div className="section-title"><i className="fa-solid fa-piggy-bank" /> Total</div>
      {/* Carry-over row: saldo anterior + reservas acumuladas */}
      <div className="carry-over-row">
        <div className="carry-card prev-balance">
          <div className="carry-icon"><i className="fa-solid fa-vault" /></div>
          <div className="carry-info">
            <div className="carry-label">Saldo Anterior</div>
            <div className={`carry-value ${carryOver.previousBalance >= 0 ? "positive" : "negative"}`}>
              {carryOver.previousBalance >= 0 ? "+" : ""}{fmtBRL.format(carryOver.previousBalance)}
            </div>
            <div className="carry-hint">Acumulado dos meses anteriores</div>
          </div>
        </div>

        <div className="carry-card reserves">
          <div className="carry-icon"><i className="fa-solid fa-piggy-bank" /></div>
          <div className="carry-info">
            <div className="carry-label">Reservas Líquidas</div>
            <div className={`carry-value ${carryOver.totalReserves >= 0 ? "positive" : "negative"}`}>{fmtBRL.format(carryOver.totalReserves)}</div>
            <div className="carry-hint">
              Anteriores: {fmtBRL.format(carryOver.accumulatedReserves)} · Este mês: {fmtBRL.format(carryOver.monthlyReserve)}
            </div>
          </div>
        </div>

        <div className="carry-card total">
          <div className="carry-icon"><i className="fa-solid fa-scale-balanced" /></div>
          <div className="carry-info">
            <div className="carry-label">Saldo Total</div>
            <div className={`carry-value ${saldoTotal >= 0 ? "positive" : "negative"}`}>
              {saldoTotal >= 0 ? "+" : ""}{fmtBRL.format(saldoTotal)}
            </div>
            <div className="carry-hint">Caixa Atual + Todas as Reservas</div>
          </div>
        </div>
      </div>

      <div className="section-title"><i className="fa-solid fa-calendar-days" /> Mês</div>
      {/* Monthly KPIs */}
      <div className="kpis">
        <div className="kpi in">
          <div className="row">
            <div>
              <div className="k">Entradas</div>
              <div className="v">{fmtBRL.format(income)}</div>
              <div className="t">Total recebido no mês</div>
            </div>
            <div className="kpi-icon"><i className="fa-solid fa-arrow-down" /></div>
          </div>
        </div>

        <div className="kpi out">
          <div className="row">
            <div>
              <div className="k">Saídas</div>
              <div className="v">{fmtBRL.format(expense)}</div>
              <div className="t">Total gasto no mês</div>
            </div>
            <div className="kpi-icon"><i className="fa-solid fa-arrow-up" /></div>
          </div>
        </div>

        <div className="kpi bal">
          <div className="row">
            <div>
              <div className="k">Saldo do Mês</div>
              <div className="v">{fmtBRL.format(saldoDoMes)}</div>
              <div className="t">Anterior + Saldo do mês atual</div>
            </div>
            <div className="kpi-icon"><i className="fa-solid fa-cash-register" /></div>
          </div>
        </div>
      </div>
    </>
  );
}

