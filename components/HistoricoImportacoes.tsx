"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataBR } from "@/lib/formato";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useConfirmacao } from "@/lib/useConfirmacao";

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
  const confirmacao = useConfirmacao<ImportacaoHistorico>();

  if (importacoes.length === 0) return null;

  async function pedirDesfazer(item: ImportacaoHistorico) {
    const ok = await confirmacao.pedir(item);
    if (ok) desfazer(item);
  }

  async function desfazer(item: ImportacaoHistorico) {
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
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
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
                onClick={() => pedirDesfazer(item)}
                disabled={desfazendo === item.id}
                className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                aria-label={`Desfazer importação de ${item.arquivo_nome}`}
              >
                Desfazer
              </button>
            )}
          </li>
        ))}
      </ul>

      {confirmacao.alvo && (
        <ConfirmDialog
          aberto
          titulo="Desfazer importação"
          mensagem={`Desfazer "${confirmacao.alvo.arquivo_nome}"? As ${confirmacao.alvo.total_importado} transações importadas por ela serão excluídas. Não dá para desfazer isso.`}
          rotuloConfirmar="Desfazer importação"
          aoConfirmar={confirmacao.confirmar}
          aoCancelar={confirmacao.cancelar}
        />
      )}
    </div>
  );
}
