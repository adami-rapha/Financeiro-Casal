import { db } from "./db";
import type { Category } from "./types";

const DEFAULT_CATEGORIES = [
  "Salário",
  "Entrada",
  "Supermercado",
  "Cartão",
  "Contas",
  "Transporte",
  "Empréstimos/Financiamentos",
  "Impostos/Taxas",
  "Pets",
  "Móveis/Eletrodomésticos",
  "Produtos de Limpeza",
  "Saúde",
  "Lazer",
  "Assinaturas",
  "Reservas",
  "Jogos/Apostas",
  "Investimentos",
  "Viagens",
  "Outros",
].map(String);

// ID estável por nome => se rodar 2x, não duplica (sobrescreve)
function stableCategoryId(name: string) {
  const slug = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove acentos
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `cat_${slug}`;
}

export async function ensureSeed() {
  const catCount = await db.categories.count();
  if (catCount !== 0) return;

  const now = Date.now();

  await db.transaction("rw", db.categories, async () => {
    const cats: Category[] = DEFAULT_CATEGORIES.map((name) => ({
      id: stableCategoryId(name),
      name,
      archived: false,
      createdAt: now,
    }));

    // bulkPut: cria ou atualiza, sem duplicar
    await db.categories.bulkPut(cats);
  });
}