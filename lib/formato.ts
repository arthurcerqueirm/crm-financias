const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function moeda(valor: number, compacto = false): string {
  if (compacto && Math.abs(valor) >= 1000) {
    const mil = valor / 1000;
    if (Math.abs(valor) >= 1_000_000) {
      return `R$ ${(valor / 1_000_000).toFixed(1).replace(".", ",")}M`;
    }
    return `R$ ${mil.toFixed(1).replace(".", ",")}k`;
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function percentual(valor: number): string {
  return `${valor >= 0 ? "+" : ""}${valor.toFixed(1).replace(".", ",")}%`;
}

/** "2026-03-15" -> "15/03/2026" (sem passar por Date, evita fuso). */
export function dataBR(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "2026-03" -> "Mar/26" */
export function mesCurto(anoMes: string): string {
  const [ano, mes] = anoMes.split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

/** "2026-03" -> "Março de 2026" */
export function mesLongo(anoMes: string): string {
  const [ano, mes] = anoMes.split("-");
  const nomes = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${nomes[Number(mes) - 1]} de ${ano}`;
}

export function mesAtual(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
}

export function hojeISO(): string {
  const hoje = new Date();
  return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
}

/** Primeiro e último dia do mês "2026-03" em ISO. */
export function limitesDoMes(anoMes: string): { inicio: string; fim: string } {
  const [ano, mes] = anoMes.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  return {
    inicio: `${anoMes}-01`,
    fim: `${anoMes}-${String(ultimoDia).padStart(2, "0")}`,
  };
}

/** Lista os N meses até o mês de referência: ["2025-10", ..., "2026-03"]. */
export function ultimosMeses(quantidade: number, ate = mesAtual()): string[] {
  const [ano, mes] = ate.split("-").map(Number);
  const meses: string[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(ano, mes - 1 - i, 1);
    meses.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return meses;
}

export function mesAnterior(anoMes: string): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  const d = new Date(ano, mes - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
