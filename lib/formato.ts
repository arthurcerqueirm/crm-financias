const MESES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

/**
 * Converte valores em formato brasileiro ou americano para número.
 * "1.234,56" -> 1234.56 | "-1,234.56" -> -1234.56 | "R$ 45,90" -> 45.9
 *
 * Usada tanto para ler extratos bancários quanto para os formulários da
 * interface — é a mesma ambiguidade dos dois lados (usuário digita "89.90"
 * pensando em ponto decimal, banco exporta "1.234,56" com ponto de milhar) e
 * merece a mesma lógica de desambiguação nos dois lugares.
 */
export function lerValor(bruto: string): number | null {
  if (!bruto) return null;

  let texto = bruto.trim();
  if (!texto) return null;

  // Valor entre parênteses é negativo na contabilidade: (150,00)
  let negativo = /^\(.*\)$/.test(texto);
  if (negativo) texto = texto.slice(1, -1);

  texto = texto.replace(/r\$/gi, "").replace(/\s/g, "");
  if (texto.startsWith("-")) {
    negativo = true;
    texto = texto.slice(1);
  } else if (texto.startsWith("+")) {
    texto = texto.slice(1);
  }

  if (!/[\d]/.test(texto)) return null;

  const ultimaVirgula = texto.lastIndexOf(",");
  const ultimoPonto = texto.lastIndexOf(".");

  if (ultimaVirgula > -1 && ultimoPonto > -1) {
    // O separador decimal é o que vem por último.
    if (ultimaVirgula > ultimoPonto) {
      texto = texto.replace(/\./g, "").replace(",", ".");
    } else {
      texto = texto.replace(/,/g, "");
    }
  } else if (ultimaVirgula > -1) {
    // Só vírgula: decimal se tiver 1-2 casas depois, senão é separador de milhar.
    const casas = texto.length - ultimaVirgula - 1;
    texto = casas <= 2 ? texto.replace(",", ".") : texto.replace(/,/g, "");
  } else if (ultimoPonto > -1) {
    const casas = texto.length - ultimoPonto - 1;
    if (casas === 3 && /^\d{1,3}(\.\d{3})+$/.test(texto)) {
      texto = texto.replace(/\./g, ""); // 1.234 = mil duzentos e trinta e quatro
    }
  }

  const numero = Number(texto);
  if (!Number.isFinite(numero)) return null;
  return negativo ? -numero : numero;
}

/**
 * Como lerValor(), mas para campos de formulário que só aceitam quantia
 * positiva (valor de um lançamento, saldo de um ativo, orçamento de uma
 * categoria). Rejeita zero e negativo — aqui não existe "gasto de R$ 0".
 */
export function lerValorPositivo(bruto: string): number | null {
  const numero = lerValor(bruto);
  if (numero === null) return null;
  const absoluto = Math.abs(numero);
  return absoluto > 0 ? absoluto : null;
}

/** Escapa os coringas do LIKE/ILIKE do Postgres (% e _) num termo de busca livre. */
export function escaparLike(texto: string): string {
  return texto.replace(/[%_\\]/g, (c) => `\\${c}`);
}

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

/**
 * Desloca "agora" para o horário de Brasília e devolve os componentes de
 * data via os getters de UTC — um truque deliberado, não um bug.
 *
 * As funções serverless da Vercel rodam em UTC, e o middleware roda num
 * runtime edge que pode nem respeitar a variável TZ do processo. Se
 * mesAtual() usasse new Date().getMonth() puro, entre 21h e meia-noite no
 * Brasil o servidor já estaria no dia seguinte em UTC — o painel abriria no
 * mês errado bem na hora em que mais gente confere o extrato do dia.
 * Subtrair o offset fixo e ler pelos getters de UTC dá o mesmo resultado em
 * qualquer runtime, sem depender de configuração de fuso do host. O Brasil
 * não observa horário de verão desde 2019, então o offset fixo -03:00 é
 * seguro o ano inteiro.
 */
const OFFSET_BRASILIA_MS = 3 * 60 * 60 * 1000;

function agoraBrasilia(): Date {
  return new Date(Date.now() - OFFSET_BRASILIA_MS);
}

export function mesAtual(): string {
  const hoje = agoraBrasilia();
  return `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function hojeISO(): string {
  const hoje = agoraBrasilia();
  return `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, "0")}-${String(hoje.getUTCDate()).padStart(2, "0")}`;
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
