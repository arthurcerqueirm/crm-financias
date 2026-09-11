import type { RegistroPatrimonio, TransacaoComCategoria } from "@/lib/tipos";
import { ultimosMeses } from "@/lib/formato";

export type ResumoMes = {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
};

export type FatiaCategoria = {
  id: string;
  nome: string;
  cor: string;
  icone: string;
  total: number;
  transacoes: number;
  fatia: number;
};

const SEM_CATEGORIA = {
  id: "sem-categoria",
  nome: "Sem categoria",
  cor: "#94a3b8",
  icone: "❔",
};

export function mesDa(dataISO: string): string {
  return dataISO.slice(0, 7);
}

/** Só receita e despesa entram nas contas — transferência é dinheiro andando de bolso. */
function contabiliza(t: TransacaoComCategoria): boolean {
  return t.tipo === "receita" || t.tipo === "despesa";
}

export function somar(
  transacoes: TransacaoComCategoria[],
  tipo: "receita" | "despesa",
): number {
  return transacoes
    .filter((t) => t.tipo === tipo)
    .reduce((soma, t) => soma + Number(t.valor), 0);
}

/** Série mensal de receitas x despesas, incluindo meses sem movimento. */
export function serieMensal(
  transacoes: TransacaoComCategoria[],
  quantidadeMeses: number,
  ate?: string,
): ResumoMes[] {
  const meses = ultimosMeses(quantidadeMeses, ate);
  const porMes = new Map<string, ResumoMes>(
    meses.map((mes) => [mes, { mes, receitas: 0, despesas: 0, saldo: 0 }]),
  );

  for (const t of transacoes) {
    if (!contabiliza(t)) continue;
    const registro = porMes.get(mesDa(t.data));
    if (!registro) continue;
    if (t.tipo === "receita") registro.receitas += Number(t.valor);
    else registro.despesas += Number(t.valor);
  }

  for (const registro of porMes.values()) {
    registro.saldo = registro.receitas - registro.despesas;
  }

  return meses.map((mes) => porMes.get(mes)!);
}

/** Quebra das despesas (ou receitas) por categoria, da maior para a menor. */
export function porCategoria(
  transacoes: TransacaoComCategoria[],
  tipo: "receita" | "despesa" = "despesa",
): FatiaCategoria[] {
  const mapa = new Map<string, FatiaCategoria>();

  for (const t of transacoes) {
    if (t.tipo !== tipo) continue;
    const cat = t.categorias ?? SEM_CATEGORIA;
    const atual = mapa.get(cat.id) ?? {
      id: cat.id,
      nome: cat.nome,
      cor: cat.cor,
      icone: "icone" in cat ? cat.icone : SEM_CATEGORIA.icone,
      total: 0,
      transacoes: 0,
      fatia: 0,
    };
    atual.total += Number(t.valor);
    atual.transacoes += 1;
    mapa.set(cat.id, atual);
  }

  const lista = [...mapa.values()].sort((a, b) => b.total - a.total);
  const total = lista.reduce((s, c) => s + c.total, 0);
  for (const item of lista) {
    item.fatia = total > 0 ? (item.total / total) * 100 : 0;
  }
  return lista;
}

/**
 * Evolução do patrimônio: para cada mês, o registro mais recente de cada
 * ativo até aquele mês. Assim um ativo informado uma vez continua contando
 * nos meses seguintes, em vez de sumir do gráfico.
 */
export function evolucaoPatrimonio(
  registros: RegistroPatrimonio[],
  quantidadeMeses: number,
): { mes: string; ativos: number; passivos: number; liquido: number }[] {
  const meses = ultimosMeses(quantidadeMeses);
  const ordenados = [...registros].sort((a, b) => a.data.localeCompare(b.data));

  return meses.map((mes) => {
    const ultimoPorNome = new Map<string, RegistroPatrimonio>();
    for (const r of ordenados) {
      if (mesDa(r.data) <= mes) ultimoPorNome.set(r.nome, r);
    }

    let ativos = 0;
    let passivos = 0;
    for (const r of ultimoPorNome.values()) {
      if (r.tipo === "ativo") ativos += Number(r.valor);
      else passivos += Number(r.valor);
    }

    return { mes, ativos, passivos, liquido: ativos - passivos };
  });
}

/** Lançamentos que se repetem com o mesmo valor — assinaturas e mensalidades. */
export function detectarRecorrentes(
  transacoes: TransacaoComCategoria[],
): { descricao: string; valor: number; ocorrencias: number }[] {
  const grupos = new Map<
    string,
    { descricao: string; valor: number; meses: Set<string> }
  >();

  for (const t of transacoes) {
    if (t.tipo !== "despesa") continue;
    const chave = `${t.descricao.toLowerCase()}|${Number(t.valor).toFixed(2)}`;
    const grupo = grupos.get(chave) ?? {
      descricao: t.descricao,
      valor: Number(t.valor),
      meses: new Set<string>(),
    };
    grupo.meses.add(mesDa(t.data));
    grupos.set(chave, grupo);
  }

  return [...grupos.values()]
    .filter((g) => g.meses.size >= 2)
    .map((g) => ({
      descricao: g.descricao,
      valor: g.valor,
      ocorrencias: g.meses.size,
    }))
    .sort((a, b) => b.valor * b.ocorrencias - a.valor * a.ocorrencias);
}

export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return null;
  return ((atual - anterior) / Math.abs(anterior)) * 100;
}
