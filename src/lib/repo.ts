import { db } from "./db";
import type { Category, Transaction, TxType, Involves, PaidBy } from "./types";
import { uid, monthKeyFromDate } from "./utils";

export async function listCategories(includeArchived = false): Promise<Category[]> {
  const cats = await db.categories.toArray();
  return includeArchived ? cats : cats.filter(c => !c.archived);
}

export async function addCategory(name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;
  const existing = await db.categories.where("name").equalsIgnoreCase(trimmed).first();
  if (existing) throw new Error("Categoria já existe.");
  await db.categories.add({ id: uid(), name: trimmed, archived: false, createdAt: Date.now() });
}

export async function archiveCategory(id: string): Promise<void> {
  await db.categories.update(id, { archived: true });
}

export async function unarchiveCategory(id: string): Promise<void> {
  await db.categories.update(id, { archived: false });
}

export async function listMonths(): Promise<string[]> {
  const all = await db.transactions.orderBy("monthKey").uniqueKeys();
  return (all as string[]).sort();
}

export async function listTransactionsByMonth(monthKey: string): Promise<Transaction[]> {
  return db.transactions.where("monthKey").equals(monthKey).sortBy("sortOrder");
}

export type TxInput = {
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
};

export async function upsertTransaction(input: TxInput): Promise<void> {
  const now = Date.now();
  const prev = input.id ? await db.transactions.get(input.id) : undefined;

  const tx: Transaction = {
    id: input.id ?? uid(),
    date: input.date,
    monthKey: monthKeyFromDate(input.date),
    description: input.description.trim(),
    amount: Math.abs(input.amount),
    type: input.type,
    categoryId: input.categoryId,
    involves: input.involves,
    paidBy: input.paidBy,
    sortOrder: prev?.sortOrder ?? now,
    reserveTargetMonth: input.reserveTargetMonth ?? prev?.reserveTargetMonth ?? null,
    linkedReserveId: input.linkedReserveId ?? prev?.linkedReserveId ?? null,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };

  await db.transactions.put(tx);
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id);
}

export async function listAllTransactions(): Promise<Transaction[]> {
  return db.transactions.toArray();
}

/** Retorna reservas (transfers) que ainda têm saldo a resgatar e que não "venceram" automaticamente */
export async function getActiveReserves(monthKey?: string): Promise<Transaction[]> {
  const all = await db.transactions.toArray();
  const withdrawalMap = new Map<string, number>();

  all.forEach(tx => {
    if (tx.type === "reserve-withdraw" && tx.linkedReserveId) {
      withdrawalMap.set(tx.linkedReserveId, (withdrawalMap.get(tx.linkedReserveId) || 0) + tx.amount);
    }
  });

  return all
    .filter(tx => {
      if (tx.type !== "transfer") return false;
      const withdrawnAmount = withdrawalMap.get(tx.id) || 0;
      const hasBalance = tx.amount - withdrawnAmount > 0.01;
      if (!hasBalance) return false;

      // Se houver mês alvo e estivermos em um mês >= ao alvo, a reserva "venceu" e não deve ser resgatada manualmente
      if (monthKey && tx.reserveTargetMonth && tx.reserveTargetMonth <= monthKey) {
        return false;
      }

      return true;
    })
    .map(tx => {
      const withdrawnAmount = withdrawalMap.get(tx.id) || 0;
      return { ...tx, amount: tx.amount - withdrawnAmount };
    });
}

/** Bulk-update sortOrder for a list of transaction IDs (in desired order) */
export async function reorderTransactions(ids: string[]): Promise<void> {
  await db.transaction("rw", db.transactions, async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.transactions.update(ids[i], { sortOrder: i });
    }
  });
}
