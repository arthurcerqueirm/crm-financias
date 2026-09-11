import { createClient } from "@/lib/supabase/server";
import PainelAnalise from "@/components/PainelAnalise";
import SeletorMes from "@/components/SeletorMes";
import { GraficoTendencia } from "@/components/Graficos";
import { limitesDoMes, mesAtual, ultimosMeses } from "@/lib/formato";
import { mesDa, porCategoria, serieMensal, somar } from "@/lib/agregacoes";
import type { Insight, TransacaoComCategoria } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaAnalise({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesAtual();
  const { inicio, fim } = limitesDoMes(mes);

  const supabase = await createClient();
  const [{ data: transacoes }, { data: insights }] = await Promise.all([
    supabase
      .from("transacoes")
      .select("*, categorias(id,nome,cor,icone), contas(id,nome)")
      .gte("data", `${ultimosMeses(6, mes)[0]}-01`)
      .lte("data", fim),
    supabase
      .from("insights")
      .select("*")
      .eq("periodo_inicio", inicio)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const lista = (transacoes ?? []) as TransacaoComCategoria[];
  const doMes = lista.filter((t) => mesDa(t.data) === mes);
  const maiorCategoria = porCategoria(doMes, "despesa")[0];

  const serie = serieMensal(lista, 6, mes);
  const tendenciaTopo = maiorCategoria
    ? ultimosMeses(6, mes).map((m) => ({
        mes: m,
        valor: somar(
          lista.filter(
            (t) => mesDa(t.data) === m && (t.categorias?.id ?? "sem-categoria") === maiorCategoria.id,
          ),
          "despesa",
        ),
      }))
    : [];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Análise com IA
          </h1>
          <p className="text-sm text-[var(--color-suave)]">
            Onde seu dinheiro está indo e o que dá para cortar.
          </p>
        </div>
        <SeletorMes mes={mes} maximo={mesAtual()} />
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PainelAnalise
            mes={mes}
            insightInicial={((insights ?? [])[0] as Insight) ?? null}
            temTransacoes={doMes.length > 0}
          />
        </div>

        <div className="space-y-4">
          <div className="painel">
            <p className="titulo-painel">Quanto sobra por mês</p>
            <div className="mt-3">
              <GraficoTendencia
                dados={serie.map((s) => ({ mes: s.mes, valor: s.saldo }))}
                rotulo="Sobrou"
                cor="#4a9eff"
              />
            </div>
          </div>

          {maiorCategoria && (
            <div className="painel">
              <p className="titulo-painel">
                {maiorCategoria.icone} {maiorCategoria.nome} — 6 meses
              </p>
              <div className="mt-3">
                <GraficoTendencia
                  dados={tendenciaTopo}
                  rotulo={maiorCategoria.nome}
                  cor={maiorCategoria.cor}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
