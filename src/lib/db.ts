import Dexie, { type Table } from "dexie";
import type { Category, Transaction } from "./types";

export class FinanceiroDB extends Dexie {
  categories!: Table<Category, string>;
  transactions!: Table<Transaction, string>;

  constructor() {
    super("financeiro_casal");

    // v1 — schema original
    this.version(1).stores({
      categories: "id,name,archived,createdAt",
      transactions: "id,monthKey,date,type,categoryId,involves,paidBy,createdAt,updatedAt",
    });

    // v2 — adiciona sortOrder
    this.version(2).stores({
      categories: "id,name,archived,createdAt",
      transactions: "id,monthKey,date,type,categoryId,involves,paidBy,sortOrder,createdAt,updatedAt",
    }).upgrade(tx => {
      return tx.table("transactions").toCollection().modify(item => {
        if (item.sortOrder === undefined) {
          item.sortOrder = item.createdAt ?? Date.now();
        }
      });
    });

    // v3 — adiciona reserveTargetMonth e linkedReserveId
    this.version(3).stores({
      categories: "id,name,archived,createdAt",
      transactions: "id,monthKey,date,type,categoryId,involves,paidBy,sortOrder,reserveTargetMonth,linkedReserveId,createdAt,updatedAt",
    }).upgrade(tx => {
      return tx.table("transactions").toCollection().modify(item => {
        if (item.reserveTargetMonth === undefined) {
          item.reserveTargetMonth = null;
        }
        if (item.linkedReserveId === undefined) {
          item.linkedReserveId = null;
        }
      });
    });
  }
}

export const db = new FinanceiroDB();
