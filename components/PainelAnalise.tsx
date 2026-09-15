"use client";

import { useState } from "react";
import { dataBR, moeda, mesLongo } from "@/lib/formato";
import type { Insight } from "@/lib/tipos";

export default function PainelAnalise({
  mes,
  insightInicial,
  temTransacoes,
}: {
  mes: string;
  insightInicial: Insight | null;
  temTransacoes: boolean;
}) {
  const [insight, setInsight] = useState<Insight | null>(insightInicial);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function analisar() {
    setCarregando(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/analise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mes }),
      });
      const json = await resposta.json();
      if (!resposta.ok) setErro(json.erro ?? "Não consegui gerar a análise.");
      else setInsight(json.insight as Insight);
    } catch {
      setErro("Falha de conexão ao gerar a análise.");
    } finally {
      setCarregando(false);
    }
  }

  const economiaTotal =
    insight?.dados.economias?.reduce((s, e) => s + e.economia_mensal, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="painel flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold">{mesLongo(mes)}</p>
          <p className="text-xs text-[var(--color-suave)]">
            {insight
              ? `Última análise em ${dataBR(insight.created_at)}`
              : "Ainda sem análise para este mês"}
          </p>
        </div>
        <button
          onClick={analisar}
          disabled={carregando || !temTransacoes}
          className="botao"
        >
          {carregando
            ? "Analisando..."
            : insight
              ? "Analisar de novo"
              : "Analisar este mês"}
        </button>
      </div>

      {!temTransacoes && (
        <p className="painel text-sm text-[var(--color-suave)]">
          Não há transações neste mês. Importe um extrato para a IA ter o que
          analisar.
        </p>
      )}

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
          {erro}
        </p>
      )}

      {carregando && (
        <div className="painel space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-[var(--color-painel-alto)]"
              style={{ width: `${100 - i * 15}%` }}
            />
          ))}
        </div>
      )}

      {insight && !carregando && (
        <>
          <div className="painel">
            <p className="titulo-painel">Resumo</p>
            <p className="mt-2 text-[15px] leading-relaxed">{insight.resumo}</p>
          </div>

          {(insight.dados.destaques?.length ?? 0) > 0 && (
            <div className="painel">
              <p className="titulo-painel">O que chamou atenção</p>
              <ul className="mt-3 space-y-2.5">
                {insight.dados.destaques!.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-azul)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(insight.dados.alertas?.length ?? 0) > 0 && (
            <div className="painel border-[var(--color-ambar)]/30">
              <p className="titulo-painel text-[var(--color-ambar)]">Alertas</p>
              <ul className="mt-3 space-y-2.5">
                {insight.dados.alertas!.map((item, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ambar)]" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(insight.dados.economias?.length ?? 0) > 0 && (
            <div className="painel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="titulo-painel">Onde dá para economizar</p>
                <span className="text-sm font-semibold text-[var(--color-verde)]">
                  até {moeda(economiaTotal)}/mês
                </span>
              </div>
              <ul className="mt-3 space-y-3">
                {insight.dados.economias!.map((economia, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-[var(--color-borda)] bg-[var(--color-fundo)] p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold">{economia.titulo}</p>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--color-verde)]">
                        {moeda(economia.economia_mensal)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-suave)]">
                      {economia.descricao}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
