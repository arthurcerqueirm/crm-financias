import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import { dataBR, escaparLike, limitesDoMes } from "@/lib/formato";
import type { TransacaoComCategoria } from "@/lib/tipos";

/** Escapa um campo para CSV: aspas duplicadas, campo inteiro entre aspas. */
function celulaCSV(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/**
 * Exporta as transações do usuário em CSV. Sem parâmetros, exporta tudo — é
 * o backup para levar os dados embora. Com mes/categoria/tipo/busca (os
 * mesmos filtros da tela de Transações), exporta só o que está sendo visto
 * ali, que é o que a pessoa espera ao clicar em "Exportar CSV" numa lista já
 * filtrada.
 */
export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const mes = url.searchParams.get("mes");
  const categoria = url.searchParams.get("categoria");
  const tipo = url.searchParams.get("tipo");
  const busca = url.searchParams.get("busca");

  let consulta = supabase
    .from("transacoes")
    .select(
      "*, categorias(id,nome,cor,icone), contas!transacoes_conta_id_fkey(id,nome), contas_destino:contas!transacoes_conta_destino_id_fkey(id,nome)",
    );

  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const { inicio, fim } = limitesDoMes(mes);
    consulta = consulta.gte("data", inicio).lte("data", fim);
  }
  if (categoria === "sem-categoria") {
    consulta = consulta.is("categoria_id", null);
  } else if (categoria) {
    consulta = consulta.eq("categoria_id", categoria);
  }
  if (tipo) consulta = consulta.eq("tipo", tipo);
  if (busca) consulta = consulta.ilike("descricao", `%${escaparLike(busca)}%`);

  const { data, error } = await consulta.order("data", { ascending: false });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  const transacoes = (data ?? []) as TransacaoComCategoria[];

  const cabecalho = [
    "Data",
    "Descrição",
    "Descrição original",
    "Valor",
    "Tipo",
    "Categoria",
    "Conta",
    "Conta destino",
    "Observação",
    "Origem",
  ];

  const linhas = transacoes.map((t) =>
    [
      dataBR(t.data),
      t.descricao,
      t.descricao_original ?? "",
      // Vírgula como decimal e sinal explícito — abre certo no Excel em pt-BR.
      `${t.tipo === "despesa" ? "-" : ""}${Number(t.valor).toFixed(2).replace(".", ",")}`,
      t.tipo,
      t.categorias?.nome ?? "",
      t.contas?.nome ?? "",
      t.contas_destino?.nome ?? "",
      t.observacao ?? "",
      t.origem,
    ]
      .map(celulaCSV)
      .join(";"),
  );

  // BOM UTF-8: sem ele o Excel no Windows lê acentuação errada num CSV UTF-8.
  const csv = "﻿" + [cabecalho.map(celulaCSV).join(";"), ...linhas].join("\r\n");

  const nomeArquivo = mes ? `transacoes-${mes}.csv` : "transacoes.csv";

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
