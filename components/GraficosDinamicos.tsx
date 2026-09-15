"use client";

import dynamic from "next/dynamic";

/**
 * Versões com import dinâmico dos gráficos — o recharts é uma biblioteca
 * pesada, e nenhum gráfico precisa estar pronto no HTML que o servidor
 * manda; ssr:false tira a biblioteca inteira do JS que carrega no primeiro
 * acesso e só busca quando a página realmente vai desenhar um gráfico.
 */

function EsqueletoGrafico({ altura }: { altura: number }) {
  return (
    <div
      className="animate-pulse rounded-xl bg-[var(--color-painel-alto)]"
      style={{ height: altura }}
    />
  );
}

export const GraficoReceitaDespesa = dynamic(
  () => import("@/components/Graficos").then((m) => m.GraficoReceitaDespesa),
  { ssr: false, loading: () => <EsqueletoGrafico altura={260} /> },
);

export const GraficoCategorias = dynamic(
  () => import("@/components/Graficos").then((m) => m.GraficoCategorias),
  { ssr: false, loading: () => <EsqueletoGrafico altura={260} /> },
);

export const GraficoPatrimonio = dynamic(
  () => import("@/components/Graficos").then((m) => m.GraficoPatrimonio),
  { ssr: false, loading: () => <EsqueletoGrafico altura={280} /> },
);

export const GraficoTendencia = dynamic(
  () => import("@/components/Graficos").then((m) => m.GraficoTendencia),
  { ssr: false, loading: () => <EsqueletoGrafico altura={220} /> },
);

export const GraficoSaldoMensal = dynamic(
  () => import("@/components/Graficos").then((m) => m.GraficoSaldoMensal),
  { ssr: false, loading: () => <EsqueletoGrafico altura={220} /> },
);
