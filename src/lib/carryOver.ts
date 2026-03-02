import type { Transaction } from "./types";

export type CarryOverData = {
    /** Saldo acumulado dos meses anteriores (income − expense − transfer + reserve-withdraw) */
    previousBalance: number;
    /** Total de reservas (transfers) acumuladas dos meses anteriores, líquido de resgates */
    accumulatedReserves: number;
    /** Reservas do mês atual (líquido: transfers - resgates) */
    monthlyReserve: number;
    /** Total geral de reservas (anteriores + atual) */
    totalReserves: number;
    /** Reservas com previsão de resgate neste mês (para gerar fantasmas) */
    autoWithdrawals: Transaction[];
};

/**
 * Computa o saldo carry-over e reservas acumuladas.
 *
 * - previousBalance: soma de (income − expense − transfer + reserve-withdraw) de todos os meses ANTES de currentMonthKey
 * - accumulatedReserves: soma de (transfers - reserve-withdraws) de todos os meses ANTES de currentMonthKey
 * - monthlyReserve: (transfers - reserve-withdraws) apenas do mês atual
 * - totalReserves: accumulatedReserves + monthlyReserve
 * - autoWithdrawals: reservas com reserveTargetMonth === currentMonthKey que ainda não foram resgatadas
 */
export function computeCarryOver(allTx: Transaction[], currentMonthKey: string): CarryOverData {
    let prevIncome = 0;
    let prevExpense = 0;
    let prevTransfer = 0;
    let prevWithdraw = 0;
    let curTransfer = 0;
    let curWithdraw = 0;

    const withdrawalMap = new Map<string, number>();
    for (const tx of allTx) {
        if (tx.type === "reserve-withdraw" && tx.linkedReserveId) {
            withdrawalMap.set(tx.linkedReserveId, (withdrawalMap.get(tx.linkedReserveId) || 0) + tx.amount);
        }
    }

    for (const tx of allTx) {
        if (tx.isAuto) continue;

        if (tx.monthKey < currentMonthKey) {
            if (tx.type === "income") prevIncome += tx.amount;
            else if (tx.type === "expense") prevExpense += tx.amount;
            else if (tx.type === "transfer") {
                prevTransfer += tx.amount;
                // Saldo que era pra ter sido resgatado no passado mas não foi manualmente
                const withdrawnAmount = withdrawalMap.get(tx.id) || 0;
                const remainingAmount = tx.amount - withdrawnAmount;
                if (tx.reserveTargetMonth && tx.reserveTargetMonth < currentMonthKey && remainingAmount > 0.01) {
                    prevWithdraw += remainingAmount;
                }
            } else if (tx.type === "reserve-withdraw") {
                prevWithdraw += tx.amount;
            }
        } else if (tx.monthKey === currentMonthKey) {
            if (tx.type === "transfer") curTransfer += tx.amount;
            else if (tx.type === "reserve-withdraw") curWithdraw += tx.amount;
        }
    }

    // Reservas com previsão de resgate NESTE mês que ainda possuem saldo
    const autoWithdrawals: Transaction[] = [];
    allTx.forEach(tx => {
        if (tx.type === "transfer" && tx.reserveTargetMonth === currentMonthKey && !tx.isAuto) {
            const withdrawnAmount = withdrawalMap.get(tx.id) || 0;
            const remainingAmount = tx.amount - withdrawnAmount;
            if (remainingAmount > 0.01) {
                autoWithdrawals.push({ ...tx, amount: remainingAmount });
            }
        }
    });

    const curAutoWithdrawAmount = autoWithdrawals.reduce((sum, tx) => sum + tx.amount, 0);

    const previousBalance = prevIncome - prevExpense - prevTransfer + prevWithdraw;
    const accumulatedReserves = prevTransfer - prevWithdraw;
    const monthlyReserve = curTransfer - curWithdraw - curAutoWithdrawAmount;
    const totalReserves = accumulatedReserves + monthlyReserve;

    return { previousBalance, accumulatedReserves, monthlyReserve, totalReserves, autoWithdrawals };
}
