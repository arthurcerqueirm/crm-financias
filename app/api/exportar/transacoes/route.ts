import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import { dataBR } from "@/lib/formato";
import type { TransacaoComCategoria } from "@/lib/tipos";

/** Escapa um campo para CSV: aspas duplicadas, campo inteiro entre aspas. */
function celulaCSV(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

/**
 * Exporta todas as transações do usuário em CSV — o backup que o app não
 * tinha nenhuma forma de gerar. Não filtra por mês de propósito: é para
 * levar os dados embora, não para uma planilha de um período só.
 */
export async function GET() {
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

  const { data, error } = await supabase
    .from("transacoes")
    .select(
      "*, categorias(id,nome,cor,icone), contas!transacoes_conta_id_fkey(id,nome), contas_destino:contas!transacoes_conta_destino_id_fkey(id,nome)",
    )
    .order("data", { ascending: false });

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

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transacoes.csv"`,
    },
  });
}
