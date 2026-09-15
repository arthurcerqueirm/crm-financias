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

  const corpo = (await request.json()) as {
    linhas: LinhaExtrato[];
    conta_id: string | null;
    arquivo: string;
  };

  const linhas = (corpo.linhas ?? []).filter((l) => !l.duplicada);
  if (linhas.length === 0) {
    return NextResponse.json(
      { erro: "Nenhuma transação nova para importar." },
      { status: 400 },
    );
  }

  const { data: importacao, error: erroImportacao } = await supabase
    .from("importacoes")
    .insert({
      user_id: user.id,
      arquivo_nome: corpo.arquivo || "extrato",
      conta_id: corpo.conta_id,
      total_linhas: corpo.linhas.length,
      total_importado: linhas.length,
      total_duplicado: corpo.linhas.length - linhas.length,
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
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ importadas: inseridas?.length ?? 0 });
}
