export type TxType = "income" | "expense" | "transfer" | "reserve-withdraw";
export type Involves = "me" | "her" | "both";
export type PaidBy = "me" | "her";

export type Category = {
  id: string;
  name: string;
  archived: boolean;
  createdAt: number;
};

export type Transaction = {
  id: string;
  date: string;        // YYYY-MM-DD
  monthKey: string;    // YYYY-MM
  description: string;
  amount: number;      // sempre positivo
  type: TxType;
  categoryId: string | null;
  involves: Involves;
  paidBy: PaidBy;
  sortOrder: number;   // para drag-and-drop reordering
  isAuto?: boolean;    // flag para lançamentos fantasmas/automáticos
  reserveTargetMonth?: string | null;  // YYYY-MM — mês previsto para resgate automático (null = indeterminada)
  linkedReserveId?: string | null;     // ID da reserva original (usado em reserve-withdraw)
  createdAt: number;
  updatedAt: number;
};
