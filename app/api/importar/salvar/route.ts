import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import type { LinhaExtrato } from "@/lib/tipos";

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

  const linhas = corpo.linhas.filter((l) => !l.duplicada);
  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma transação nova para importar." },
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
      arquivo_nome: corpo.arquivo || "extrato",
      conta_id: corpo.conta_id,
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
    conta_id: corpo.conta_id,
    categoria_id: linha.categoria_id,
    importacao_id: importacao.id,
    data: linha.data,
    descricao: linha.descricao,
    descricao_original: linha.descricao_original ?? null,
    valor: linha.valor,
    tipo: linha.tipo,
    origem: "importacao" as const,
    categorizado_por: linha.categorizado_por,
    hash_dedup: linha.hash_dedup,
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
