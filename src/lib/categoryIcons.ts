/** Map category names (lowercase, without accents) to FontAwesome icon classes */

const ICON_MAP: Record<string, string> = {
    // Income
    salario: "fa-solid fa-wallet",
    entrada: "fa-solid fa-arrow-right-to-bracket",

    // Expenses
    supermercado: "fa-solid fa-cart-shopping",
    cartao: "fa-solid fa-credit-card",
    contas: "fa-solid fa-file-invoice-dollar",
    transporte: "fa-solid fa-gas-pump",
    "emprestimos/financiamentos": "fa-solid fa-landmark",
    "impostos/taxas": "fa-solid fa-receipt",
    pets: "fa-solid fa-paw",
    "moveis/eletrodomesticos": "fa-solid fa-couch",
    "produtos de limpeza": "fa-solid fa-spray-can-sparkles",
    saude: "fa-solid fa-heart-pulse",
    lazer: "fa-solid fa-film",
    assinaturas: "fa-solid fa-repeat",
    reservas: "fa-solid fa-piggy-bank",
    "jogos/apostas": "fa-solid fa-dice",
    investimentos: "fa-solid fa-chart-line",
    viagens: "fa-solid fa-plane",
    outros: "fa-solid fa-ellipsis",

    // Common extras
    educacao: "fa-solid fa-graduation-cap",
    alimentacao: "fa-solid fa-utensils",
    moradia: "fa-solid fa-house",
    roupas: "fa-solid fa-shirt",
    presentes: "fa-solid fa-gift",
    beleza: "fa-solid fa-spa",
    tecnologia: "fa-solid fa-laptop",
    internet: "fa-solid fa-wifi",
    telefone: "fa-solid fa-phone",
    streaming: "fa-solid fa-tv",
    academia: "fa-solid fa-dumbbell",
    mercado: "fa-solid fa-cart-shopping",
    farmacia: "fa-solid fa-prescription-bottle-medical",
    dentista: "fa-solid fa-tooth",
    medico: "fa-solid fa-stethoscope",
    seguro: "fa-solid fa-shield-halved",
    aluguel: "fa-solid fa-key",
    agua: "fa-solid fa-droplet",
    luz: "fa-solid fa-bolt",
    gas: "fa-solid fa-fire",
    gasolina: "fa-solid fa-gas-pump",
};

const DEFAULT_ICON = "fa-solid fa-tag";

function normalize(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}

export function getCategoryIcon(name: string): string {
    const key = normalize(name);
    // Exact match
    if (ICON_MAP[key]) return ICON_MAP[key];

    // Partial match (if category name contains a known key)
    for (const [k, v] of Object.entries(ICON_MAP)) {
        if (key.includes(k) || k.includes(key)) return v;
    }

    return DEFAULT_ICON;
}
