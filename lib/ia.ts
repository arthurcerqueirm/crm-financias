import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const MODELO = "claude-opus-5";

export function temChaveIA(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function cliente(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// ------------------------------------------------------------------
// Categorização das transações que as regras não pegaram
// ------------------------------------------------------------------

const EsquemaCategorizacao = z.object({
  resultados: z.array(
    z.object({
      indice: z.number().describe("Índice da transação na lista enviada"),
      categoria: z
        .string()
        .describe("Nome exato de uma das categorias disponíveis"),
      comerciante: z
        .string()
        .describe(
          "Nome limpo e legível do estabelecimento, sem códigos nem numeração",
        ),
    }),
  ),
});

export type ItemParaCategorizar = {
  indice: number;
  descricao: string;
  valor: number;
  tipo: "receita" | "despesa";
};

export async function categorizarComIA(
  itens: ItemParaCategorizar[],
  categoriasDespesa: string[],
  categoriasReceita: string[],
): Promise<Map<number, { categoria: string; comerciante: string }>> {
  const mapa = new Map<number, { categoria: string; comerciante: string }>();
  if (itens.length === 0) return mapa;

  const anthropic = cliente();

  // Lotes pequenos mantêm a resposta previsível e o custo sob controle.
  const TAMANHO_LOTE = 60;
  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    const lote = itens.slice(i, i + TAMANHO_LOTE);

    const resposta = await anthropic.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(EsquemaCategorizacao),
      },
      system: [
        {
          type: "text",
          text:
            "Você classifica transações de extratos bancários brasileiros.\n\n" +
            `Categorias de DESPESA: ${categoriasDespesa.join(", ")}\n` +
            `Categorias de RECEITA: ${categoriasReceita.join(", ")}\n\n` +
            "Regras:\n" +
            "- Use exatamente um dos nomes de categoria acima, respeitando o tipo da transação.\n" +
            "- Se não houver encaixe claro, use 'Outros' (despesa) ou 'Outras Receitas' (receita).\n" +
            "- Em 'comerciante', limpe a descrição: remova códigos, datas, número de parcela " +
            "e prefixos de maquininha. Ex.: 'PAG*IFD1234 SAO PAULO' vira 'iFood'.\n" +
            "- Responda um item para cada transação enviada, mantendo o índice original.",
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: lote
            .map(
              (t) =>
                `${t.indice}. [${t.tipo}] R$ ${t.valor.toFixed(2)} — ${t.descricao}`,
            )
            .join("\n"),
        },
      ],
    });

    for (const r of resposta.parsed_output?.resultados ?? []) {
      mapa.set(r.indice, {
        categoria: r.categoria,
        comerciante: r.comerciante,
      });
    }
  }

  return mapa;
}

// ------------------------------------------------------------------
// Análise de gastos
// ------------------------------------------------------------------

const EsquemaAnalise = z.object({
  resumo: z
    .string()
    .describe("2 a 4 frases sobre a saúde financeira do período, em português"),
  destaques: z
    .array(z.string())
    .describe("3 a 5 observações concretas, cada uma com números reais"),
  alertas: z
    .array(z.string())
    .describe("Até 4 riscos ou gastos fora do padrão; lista vazia se não houver"),
  economias: z
    .array(
      z.object({
        titulo: z.string(),
        descricao: z.string(),
        economia_mensal: z
          .number()
          .describe("Economia mensal estimada em reais"),
      }),
    )
    .describe("Até 4 sugestões acionáveis de economia"),
});

export type AnaliseIA = z.infer<typeof EsquemaAnalise>;

export type DadosAnalise = {
  periodo: string;
  receitas: number;
  despesas: number;
  saldo: number;
  patrimonio: number | null;
  porCategoria: { categoria: string; total: number; transacoes: number }[];
  mesAnterior: { categoria: string; total: number }[];
  maiores: { descricao: string; valor: number; categoria: string; data: string }[];
  recorrentes: { descricao: string; valor: number; ocorrencias: number }[];
};

export async function analisarGastos(dados: DadosAnalise): Promise<AnaliseIA> {
  const anthropic = cliente();

  const resposta = await anthropic.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: zodOutputFormat(EsquemaAnalise),
    },
    system:
      "Você é um analista financeiro pessoal falando com um brasileiro sobre as " +
      "próprias finanças. Escreva em português do Brasil, em tom direto e prático, " +
      "sempre citando valores em reais.\n\n" +
      "Baseie cada afirmação apenas nos dados recebidos — nunca invente números. " +
      "Compare com o mês anterior quando os dados permitirem, aponte concentração " +
      "de gastos e assinaturas esquecidas, e faça sugestões que caibam na realidade " +
      "de quem tem essa renda. Evite conselhos genéricos de livro de finanças.",
    messages: [
      {
        role: "user",
        content:
          `Analise minhas finanças de ${dados.periodo}:\n\n` +
          JSON.stringify(dados, null, 2),
      },
    ],
  });

  const analise = resposta.parsed_output;
  if (!analise) {
    throw new Error("A IA não retornou uma análise válida.");
  }
  return analise;
}
