"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataBR } from "@/lib/formato";

export type ImportacaoHistorico = {
  id: string;
  arquivo_nome: string;
  total_linhas: number;
  total_importado: number;
  total_duplicado: number;
  created_at: string;
  contas: { nome: string } | null;
};

export default function HistoricoImportacoes({
  importacoes,
}: {
  importacoes: ImportacaoHistorico[];
}) {
  const router = useRouter();
  const [desfazendo, setDesfazendo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  if (importacoes.length === 0) return null;

  async function desfazer(item: ImportacaoHistorico) {
    if (
      !confirm(
        `Desfazer "${item.arquivo_nome}"? As ${item.total_importado} transações importadas por ela serão excluídas. Não dá para desfazer isso.`,
      )
    )
      return;

    setDesfazendo(item.id);
    setErro(null);
    const supabase = createClient();

    const { error: erroTransacoes } = await supabase
      .from("transacoes")
      .delete()
      .eq("importacao_id", item.id);

    if (erroTransacoes) {
      setErro(erroTransacoes.message);
      setDesfazendo(null);
      return;
    }

    const { error: erroImportacao } = await supabase
      .from("importacoes")
      .delete()
      .eq("id", item.id);

    if (erroImportacao) setErro(erroImportacao.message);
    else router.refresh();
    setDesfazendo(null);
  }

  return (
    <div className="painel">
      <p className="titulo-painel">Importações recentes</p>

      {erro && (
        <p className="mt-3 rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
          {erro}
        </p>
      )}

      <ul className="mt-3 divide-y divide-[var(--color-borda)]">
        {importacoes.map((item) => (
          <li
            key={item.id}
            className={`flex flex-wrap items-center gap-3 py-2.5 ${
              desfazendo === item.id ? "opacity-50" : ""
            }`}
          >
            <div className="min-w-0 flex-1 basis-48">
              <p className="truncate text-sm font-medium">{item.arquivo_nome}</p>
              <p className="text-xs text-[var(--color-suave)]">
                {dataBR(item.created_at)}
                {item.contas?.nome ? ` · ${item.contas.nome}` : ""} ·{" "}
                {item.total_importado} de {item.total_linhas} linhas
                {item.total_duplicado > 0 && ` · ${item.total_duplicado} repetidas`}
              </p>
            </div>
            {item.total_importado > 0 && (
              <button
                onClick={() => desfazer(item)}
                disabled={desfazendo === item.id}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
              >
                Desfazer
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
