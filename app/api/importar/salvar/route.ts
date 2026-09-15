import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import type { LinhaExtrato } from "@/lib/tipos";

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Confere e normaliza uma linha vinda do cliente antes de gravar.
 *
 * Esta rota é um endpoint JSON autenticado comum — nada além do bom senso
 * do navegador garante que o corpo da requisição é mesmo o que
 * /api/importar/analisar devolveu. `categoriaIds` e `contaIds` são os
 * conjuntos que pertencem ao usuário logado; qualquer id fora deles vira
 * null em vez de ser rejeitado (a linha ainda entra, só sem categoria).
 */
function sanearLinha(
  linha: LinhaExtrato,
  categoriaIds: Set<string>,
): { data: string; descricao: string; descricao_original: string | null; valor: number; tipo: "receita" | "despesa"; categoria_id: string | null; categorizado_por: LinhaExtrato["categorizado_por"]; hash_dedup: string } | null {
  if (typeof linha.data !== "string" || !DATA_ISO.test(linha.data)) return null;
  if (linha.tipo !== "receita" && linha.tipo !== "despesa") return null;

  const valor = Number(linha.valor);
  if (!Number.isFinite(valor) || valor <= 0) return null;

  const descricao = String(linha.descricao ?? "").trim().slice(0, 500) || "Sem descrição";
  const hash = typeof linha.hash_dedup === "string" ? linha.hash_dedup.slice(0, 64) : "";
  if (!hash) return null;

  const categoriaId =
    typeof linha.categoria_id === "string" && categoriaIds.has(linha.categoria_id)
      ? linha.categoria_id
      : null;

  const categorizadoPor: LinhaExtrato["categorizado_por"] =
    linha.categorizado_por === "regra" || linha.categorizado_por === "ia"
      ? linha.categorizado_por
      : "manual";

  return {
    data: linha.data,
    descricao,
    descricao_original:
      typeof linha.descricao_original === "string"
        ? linha.descricao_original.slice(0, 500)
        : null,
    valor: Math.round(valor * 100) / 100,
    tipo: linha.tipo,
    categoria_id: categoriaId,
    categorizado_por: categoriaId ? categorizadoPor : "manual",
    hash_dedup: hash,
  };
}

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

  const corpo = (await request.json().catch(() => null)) as {
    linhas: LinhaExtrato[];
    conta_id: string | null;
    arquivo: string;
    totalLinhas?: number;
    totalDuplicadas?: number;
  } | null;

  if (!corpo || !Array.isArray(corpo.linhas)) {
    return NextResponse.json({ erro: "Requisição inválida." }, { status: 400 });
  }

  // Teto defensivo: esta rota é chamada direto pelo navegador com um corpo
  // JSON — nada impede alguém de montar uma requisição maior que qualquer
  // extrato real produziria.
  if (corpo.linhas.length > 20000) {
    return NextResponse.json(
      { erro: "Muitas linhas de uma vez. Importe em partes menores." },
      { status: 400 },
    );
  }

  const [{ data: categoriasDoUsuario }, { data: contasDoUsuario }] = await Promise.all([
    supabase.from("categorias").select("id"),
    supabase.from("contas").select("id"),
  ]);
  const categoriaIds = new Set((categoriasDoUsuario ?? []).map((c) => c.id as string));
  const contaIds = new Set((contasDoUsuario ?? []).map((c) => c.id as string));

  // conta_id vem uma vez só (a mesma conta para o arquivo inteiro) — se não
  // for uma conta do próprio usuário, a importação segue sem conta, nunca
  // gravando na conta de outra pessoa.
  const contaId =
    typeof corpo.conta_id === "string" && contaIds.has(corpo.conta_id)
      ? corpo.conta_id
      : null;

  const linhas = corpo.linhas
    .filter((l) => !l.duplicada)
    .map((l) => sanearLinha(l, categoriaIds))
    .filter((l): l is NonNullable<typeof l> => l !== null);

  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma transação válida para importar." },
      { status: 400 },
    );
  }

  // O cliente já sabe esses dois números com precisão (vieram da resposta
  // de /analisar); usa-los aqui em vez de recalcular a partir da lista já
  // filtrada evita o bug de "duplicadas sempre zero" — a lista que chega
  // não carrega mais essa informação.
  const totalLinhas = Math.max(
    Number.isFinite(corpo.totalLinhas) ? Number(corpo.totalLinhas) : 0,
    corpo.linhas.length,
  );
  const totalDuplicadas = Math.max(
    0,
    Number.isFinite(corpo.totalDuplicadas) ? Number(corpo.totalDuplicadas) : 0,
  );

  const { data: importacao, error: erroImportacao } = await supabase
    .from("importacoes")
    .insert({
      user_id: user.id,
      arquivo_nome: String(corpo.arquivo || "extrato").slice(0, 255),
      conta_id: contaId,
      total_linhas: totalLinhas,
      total_importado: 0,
      total_duplicado: totalDuplicadas,
    })
    .select("id")
    .single();

  if (erroImportacao) {
    return NextResponse.json({ erro: erroImportacao.message }, { status: 500 });
  }

  const registros = linhas.map((linha) => ({
    user_id: user.id,
    conta_id: contaId,
    importacao_id: importacao.id,
    origem: "importacao" as const,
    ...linha,
  }));

  // `ignoreDuplicates` protege contra clique duplo no botão de importar.
  const { data: inseridas, error } = await supabase
    .from("transacoes")
    .upsert(registros, {
      onConflict: "user_id,hash_dedup",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    // A importação já existe como registro; sem isso o histórico mostraria
    // "0 de X" para sempre numa falha parcial. Ainda assim relata o erro.
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const importadas = inseridas?.length ?? 0;

  // Número real de linhas que entraram — só se sabe depois do upsert.
  await supabase
    .from("importacoes")
    .update({ total_importado: importadas })
    .eq("id", importacao.id);

  return NextResponse.json({ importadas });
}
