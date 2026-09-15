export type TipoTransacao = "receita" | "despesa" | "transferencia";
export type TipoCategoria = "despesa" | "receita";

export type Categoria = {
  id: string;
  user_id: string;
  nome: string;
  tipo: TipoCategoria;
  cor: string;
  icone: string;
  palavras_chave: string[];
  orcamento_mensal: number | null;
  created_at: string;
};

export type Conta = {
  id: string;
  user_id: string;
  nome: string;
  tipo: "corrente" | "poupanca" | "investimento" | "cartao" | "dinheiro" | "outro";
  instituicao: string | null;
  saldo_inicial: number;
  incluir_patrimonio: boolean;
  ativa: boolean;
  created_at: string;
};

export type Transacao = {
  id: string;
  user_id: string;
  conta_id: string | null;
  categoria_id: string | null;
  importacao_id: string | null;
  data: string;
  descricao: string;
  descricao_original: string | null;
  valor: number;
  tipo: TipoTransacao;
  observacao: string | null;
  origem: "manual" | "importacao";
  categorizado_por: "manual" | "regra" | "ia";
  hash_dedup: string | null;
  created_at: string;
};

export type TransacaoComCategoria = Transacao & {
  categorias: Pick<Categoria, "id" | "nome" | "cor" | "icone"> | null;
  contas: Pick<Conta, "id" | "nome"> | null;
};

export type RegistroPatrimonio = {
  id: string;
  user_id: string;
  conta_id: string | null;
  nome: string;
  tipo: "ativo" | "passivo";
  data: string;
  valor: number;
  created_at: string;
};

export type Insight = {
  id: string;
  user_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  resumo: string;
  dados: {
    destaques?: string[];
    alertas?: string[];
    economias?: { titulo: string; descricao: string; economia_mensal: number }[];
  };
  created_at: string;
};

/** Linha de extrato já normalizada, pronta para virar transação. */
export type LinhaExtrato = {
  data: string;
  descricao: string;
  /** Texto original do banco, antes da IA limpar para um nome de comerciante. */
  descricao_original: string | null;
  valor: number;
  tipo: TipoTransacao;
  categoria_id: string | null;
  categoria_nome: string | null;
  categorizado_por: "manual" | "regra" | "ia";
  hash_dedup: string;
  duplicada: boolean;
};
