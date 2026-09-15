import { createClient } from "@/lib/supabase/server";
import { GraficoPatrimonio } from "@/components/GraficosDinamicos";
import GerenciadorPatrimonio from "@/components/GerenciadorPatrimonio";
import { CartaoKPI } from "@/components/Ui";
import SeletorMes from "@/components/SeletorMes";
import { evolucaoPatrimonio, variacao } from "@/lib/agregacoes";
import { mesAtual } from "@/lib/formato";
import type { Conta, RegistroPatrimonio } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaPatrimonio({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesAtual();

  const supabase = await createClient();
  const [{ data: registros }, { data: contas }] = await Promise.all([
    supabase.from("patrimonio").select("*").order("data", { ascending: false }),
    supabase.from("contas").select("*").eq("ativa", true).order("nome"),
  ]);

  const lista = (registros ?? []) as RegistroPatrimonio[];
  const evolucao = evolucaoPatrimonio(lista, 12, mes);
  const atual = evolucao.at(-1);
  const anterior = evolucao.at(-2);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Patrimônio
          </h1>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            Registre o saldo de cada conta, investimento e dívida. Cada registro é
            uma foto daquele mês — o gráfico liga os pontos.
          </p>
        </div>
        <SeletorMes mes={mes} maximo={mesAtual()} />
      </div>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <CartaoKPI
          rotulo="Patrimônio líquido"
          valor={atual?.liquido ?? 0}
          variacao={variacao(atual?.liquido ?? 0, anterior?.liquido ?? 0)}
        />
        <CartaoKPI rotulo="Total em ativos" valor={atual?.ativos ?? 0} cor="verde" />
        <CartaoKPI
          rotulo="Total em dívidas"
          valor={atual?.passivos ?? 0}
          cor="vermelho"
        />
      </section>

      {lista.length > 0 && (
        <section className="painel mt-4">
          <p className="titulo-painel">Evolução nos últimos 12 meses</p>
          <div className="mt-3">
            <GraficoPatrimonio dados={evolucao} />
          </div>
        </section>
      )}

      <section className="mt-4">
        <GerenciadorPatrimonio
          registros={lista}
          contas={(contas ?? []) as Conta[]}
        />
      </section>
    </>
  );
}
