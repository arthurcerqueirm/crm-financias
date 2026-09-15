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
  /**
   * Prazo máximo em milissegundos para o total da categorização. O tempo
   * exato que a Vercel permite por função varia por plano, e estourar o
   * limite mata a função sem devolver nada — melhor parar sozinho um pouco
   * antes e devolver o que já deu tempo de categorizar do que arriscar uma
   * resposta vazia. Itens que não couberem no prazo ficam sem categoria de
   * IA (a categorização por regra já rodou antes e continua valendo).
   */
  orcamentoMs = 45_000,
): Promise<{ resultados: Map<number, { categoria: string; comerciante: string }>; estourouPrazo: boolean }> {
  const mapa = new Map<number, { categoria: string; comerciante: string }>();
  if (itens.length === 0) return { resultados: mapa, estourouPrazo: false };
  const inicio = Date.now();
  let estourouPrazo = false;

  const anthropic = cliente();
  const sistema = [
    {
      type: "text" as const,
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
      cache_control: { type: "ephemeral" as const },
    },
  ];

  async function categorizarLote(lote: ItemParaCategorizar[]) {
    const resposta = await anthropic.messages.parse({
      model: MODELO,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "low",
        format: zodOutputFormat(EsquemaCategorizacao),
      },
      system: sistema,
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

  // Lotes pequenos mantêm a resposta previsível; rodar alguns em paralelo
  // encurta o tempo total sem aumentar o custo (o preço é por token
  // processado, não por chamada) — importante para não estourar o tempo
  // máximo da função numa importação grande.
  const TAMANHO_LOTE = 60;
  const CONCORRENCIA = 3;
  const lotes = [];
  for (let i = 0; i < itens.length; i += TAMANHO_LOTE) {
    lotes.push(itens.slice(i, i + TAMANHO_LOTE));
  }

  for (let i = 0; i < lotes.length; i += CONCORRENCIA) {
    if (Date.now() - inicio > orcamentoMs) {
      estourouPrazo = true;
      break;
    }
    await Promise.all(lotes.slice(i, i + CONCORRENCIA).map(categorizarLote));
  }

  return { resultados: mapa, estourouPrazo };
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

// ------------------------------------------------------------------
// Leitura de PDF que a extração de texto não deu conta
// ------------------------------------------------------------------

const EsquemaExtratoPDF = z.object({
  transacoes: z.array(
    z.object({
      data: z.string().describe("Data do lançamento no formato AAAA-MM-DD"),
      descricao: z.string().describe("Descrição do lançamento como aparece no extrato"),
      valor: z
        .number()
        .describe("Valor do lançamento: negativo para saídas, positivo para entradas"),
    }),
  ),
});

/**
 * Último recurso para PDFs que a leitura de texto não interpreta — extratos
 * digitalizados ou com layout fora do padrão. O modelo lê o PDF direto.
 */
export async function lerPDFComIA(
  pdfBase64: string,
): Promise<{ data: string; descricao: string; valor: number }[]> {
  const anthropic = cliente();

  const resposta = await anthropic.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: zodOutputFormat(EsquemaExtratoPDF),
    },
    system:
      "Você extrai lançamentos de extratos bancários brasileiros em PDF.\n\n" +
      "Regras:\n" +
      "- Retorne um item por lançamento, na ordem em que aparecem.\n" +
      "- Saídas (débitos, pagamentos, compras) têm valor negativo; entradas positivas.\n" +
      "- Ignore linhas de saldo (saldo anterior, saldo do dia, saldo final) e " +
      "totais: não são lançamentos.\n" +
      "- Quando a linha traz valor e saldo acumulado, use o valor do lançamento, " +
      "nunca o saldo.\n" +
      "- Se a data vier só como dia/mês, use o ano do período indicado no extrato.\n" +
      "- Não invente lançamentos: extraia apenas o que está no documento.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: "Extraia todos os lançamentos deste extrato.",
          },
        ],
      },
    ],
  });

  return resposta.parsed_output?.transacoes ?? [];
}
