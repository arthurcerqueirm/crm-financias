import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import { analisarGastos, temChaveIA, type DadosAnalise } from "@/lib/ia";
import { registrarUso } from "@/lib/limiteIA";
import { detectarRecorrentes, porCategoria, somar, evolucaoPatrimonio } from "@/lib/agregacoes";
import { limitesDoMes, mesAnterior, mesLongo } from "@/lib/formato";
import type { RegistroPatrimonio, TransacaoComCategoria } from "@/lib/tipos";

// O teto exato varia por plano da Vercel; 60s é o valor conservador mais
// comum no Hobby. Uma chamada só de análise costuma terminar bem antes
// disso mesmo em effort "high".
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!supabaseConfigurado()) {
    return NextResponse.json(
      { erro: "O Supabase ainda não foi configurado neste deploy." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Você precisa estar logado." }, { status: 401 });
  }

  if (!temChaveIA()) {
    return NextResponse.json(
      {
        erro:
          "Configure a variável ANTHROPIC_API_KEY na Vercel para liberar a análise com IA.",
      },
      { status: 400 },
    );
  }

  const uso = await registrarUso(supabase, { analises: 1 });
  if (!uso.ok) {
    return NextResponse.json({ erro: uso.motivo }, { status: 429 });
  }

  const { mes } = (await request.json()) as { mes: string };
  if (!/^\d{4}-\d{2}$/.test(mes ?? "")) {
    return NextResponse.json({ erro: "Mês inválido." }, { status: 400 });
  }

  const { inicio, fim } = limitesDoMes(mes);
  const anterior = mesAnterior(mes);
  const limitesAnterior = limitesDoMes(anterior);

  const [{ data: doMes }, { data: doAnterior }, { data: patrimonio }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select("*, categorias(id,nome,cor,icone), contas(id,nome)")
        .gte("data", inicio)
        .lte("data", fim),
      supabase
        .from("transacoes")
        .select("*, categorias(id,nome,cor,icone), contas(id,nome)")
        .gte("data", limitesAnterior.inicio)
        .lte("data", limitesAnterior.fim),
      supabase.from("patrimonio").select("*"),
    ]);

  const transacoes = (doMes ?? []) as TransacaoComCategoria[];
  const anteriores = (doAnterior ?? []) as TransacaoComCategoria[];

  if (transacoes.length === 0) {
    return NextResponse.json(
      { erro: "Não há transações neste mês para analisar." },
      { status: 400 },
    );
  }

  const receitas = somar(transacoes, "receita");
  const despesas = somar(transacoes, "despesa");
  const evolucao = evolucaoPatrimonio(
    (patrimonio ?? []) as RegistroPatrimonio[],
    12,
  );

  const dados: DadosAnalise = {
    periodo: mesLongo(mes),
    receitas,
    despesas,
    saldo: receitas - despesas,
    patrimonio: evolucao.at(-1)?.liquido ?? null,
    porCategoria: porCategoria(transacoes, "despesa").map((c) => ({
      categoria: c.nome,
      total: Number(c.total.toFixed(2)),
      transacoes: c.transacoes,
    })),
    mesAnterior: porCategoria(anteriores, "despesa").map((c) => ({
      categoria: c.nome,
      total: Number(c.total.toFixed(2)),
    })),
    maiores: transacoes
      .filter((t) => t.tipo === "despesa")
      .sort((a, b) => Number(b.valor) - Number(a.valor))
      .slice(0, 15)
      .map((t) => ({
        descricao: t.descricao,
        valor: Number(t.valor),
        categoria: t.categorias?.nome ?? "Sem categoria",
        data: t.data,
      })),
    recorrentes: detectarRecorrentes([...transacoes, ...anteriores]).slice(0, 15),
  };

  try {
    const analise = await analisarGastos(dados);

    const { data: salvo, error } = await supabase
      .from("insights")
      // Um registro novo por análise, não upsert: "Analisar de novo" fica no
      // histórico do mês em vez de apagar a análise anterior — a pessoa pode
      // querer comparar o que a IA disse antes com o que diz agora.
      .insert({
        user_id: user.id,
        periodo_inicio: inicio,
        periodo_fim: fim,
        resumo: analise.resumo,
        dados: {
          destaques: analise.destaques,
          alertas: analise.alertas,
          economias: analise.economias,
        },
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }
    return NextResponse.json({ insight: salvo });
  } catch (erro) {
    return NextResponse.json(
      {
        erro:
          erro instanceof Error
            ? `A análise falhou: ${erro.message}`
            : "A análise falhou.",
      },
      { status: 502 },
    );
  }
}
