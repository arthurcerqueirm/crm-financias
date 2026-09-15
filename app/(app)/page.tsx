import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  GraficoCategorias,
  GraficoPatrimonio,
  GraficoReceitaDespesa,
  GraficoSaldoMensal,
} from "@/components/GraficosDinamicos";
import { CartaoKPI, BarraCategoria, Vazio } from "@/components/Ui";
import SeletorMes from "@/components/SeletorMes";
import {
  evolucaoPatrimonio,
  porCategoria,
  serieMensal,
  somar,
  variacao,
  mesDa,
} from "@/lib/agregacoes";
import { dataBR, limitesDoMes, mesAnterior, mesAtual, moeda, ultimosMeses } from "@/lib/formato";
import type { Categoria, RegistroPatrimonio, TransacaoComCategoria } from "@/lib/tipos";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Painel · Minhas Finanças" };

export default async function Painel({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesAtual();

  const supabase = await createClient();
  const inicioJanela = `${ultimosMeses(13, mes)[0]}-01`;
  const { fim } = limitesDoMes(mes);

  const [{ data: transacoesBrutas }, { data: patrimonioBruto }, { data: categoriasBrutas }] =
    await Promise.all([
      supabase
        .from("transacoes")
        .select("*, categorias(id,nome,cor,icone), contas(id,nome)")
        .gte("data", inicioJanela)
        .lte("data", fim)
        .order("data", { ascending: false }),
      supabase.from("patrimonio").select("*").order("data"),
      supabase.from("categorias").select("*"),
    ]);

  const transacoes = (transacoesBrutas ?? []) as TransacaoComCategoria[];
  const patrimonio = (patrimonioBruto ?? []) as RegistroPatrimonio[];
  const categorias = (categoriasBrutas ?? []) as Categoria[];

  if (transacoes.length === 0 && patrimonio.length === 0) {
    return (
      <>
        <Cabecalho mes={mes} />
        <div className="mt-6">
          <Vazio
            titulo="Ainda não há nada por aqui"
            descricao="Importe o extrato do seu banco em CSV, OFX ou PDF e o painel se monta sozinho — categorias, gráficos e análise."
            acao={
              <Link href="/importar" className="botao">
                Importar meu extrato
              </Link>
            }
          />
        </div>
      </>
    );
  }

  const doMes = transacoes.filter((t) => mesDa(t.data) === mes);
  const anterior = mesAnterior(mes);
  const doMesAnterior = transacoes.filter((t) => mesDa(t.data) === anterior);

  const receitas = somar(doMes, "receita");
  const despesas = somar(doMes, "despesa");
  const saldo = receitas - despesas;
  const taxaPoupanca = receitas > 0 ? (saldo / receitas) * 100 : 0;

  const receitasAnterior = somar(doMesAnterior, "receita");
  const despesasAnterior = somar(doMesAnterior, "despesa");

  const serie = serieMensal(transacoes, 12, mes);
  const categoriasGasto = porCategoria(doMes, "despesa");
  const evolucao = evolucaoPatrimonio(patrimonio, 12, mes);
  const patrimonioAtual = evolucao.at(-1)?.liquido ?? 0;
  const patrimonioAnterior = evolucao.at(-2)?.liquido ?? 0;

  const orcamentoPorCategoria = new Map(
    categorias.map((c) => [c.id, c.orcamento_mensal]),
  );

  return (
    <>
      <Cabecalho mes={mes} />

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <CartaoKPI
          rotulo="Receitas do mês"
          valor={receitas}
          cor="verde"
          variacao={variacao(receitas, receitasAnterior)}
        />
        <CartaoKPI
          rotulo="Despesas do mês"
          valor={despesas}
          cor="vermelho"
          variacao={variacao(despesas, despesasAnterior)}
          bomQuandoSobe={false}
        />
        <CartaoKPI
          rotulo="Sobrou no mês"
          valor={saldo}
          cor={saldo >= 0 ? "azul" : "vermelho"}
          legenda={
            receitas > 0
              ? `${taxaPoupanca.toFixed(0)}% da renda guardada`
              : undefined
          }
        />
        <CartaoKPI
          rotulo="Patrimônio líquido"
          valor={patrimonioAtual}
          variacao={variacao(patrimonioAtual, patrimonioAnterior)}
        />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="painel">
          <p className="titulo-painel">Receitas x Despesas — 12 meses</p>
          <div className="mt-3">
            <GraficoReceitaDespesa dados={serie} />
          </div>
        </div>

        <div className="painel">
          <p className="titulo-painel">Para onde foi o dinheiro este mês</p>
          <div className="mt-3">
            <GraficoCategorias dados={categoriasGasto} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <div className="painel lg:col-span-3">
          <div className="flex items-baseline justify-between gap-3">
            <p className="titulo-painel">Evolução do patrimônio</p>
            <span className="text-xs text-[var(--color-suave)]">
              {moeda(patrimonioAtual)} hoje
            </span>
          </div>
          {patrimonio.length === 0 ? (
            <p className="py-16 text-center text-sm text-[var(--color-suave)]">
              Registre seus saldos e investimentos em{" "}
              <Link href="/patrimonio" className="text-[var(--color-verde)] underline">
                Patrimônio
              </Link>{" "}
              para ver a evolução aqui.
            </p>
          ) : (
            <div className="mt-3">
              <GraficoPatrimonio dados={evolucao} />
            </div>
          )}
        </div>

        <div className="painel lg:col-span-2">
          <p className="titulo-painel">Quanto sobra por mês</p>
          <div className="mt-3">
            <GraficoSaldoMensal dados={serie} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="painel">
          <p className="titulo-painel">Gastos por categoria</p>
          {categoriasGasto.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-suave)]">
              Nenhuma despesa neste mês.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {categoriasGasto.slice(0, 9).map((c) => (
                <BarraCategoria
                  key={c.id}
                  nome={c.nome}
                  icone={c.icone}
                  cor={c.cor}
                  total={c.total}
                  fatia={c.fatia}
                  orcamento={orcamentoPorCategoria.get(c.id)}
                />
              ))}
              {categoriasGasto.length > 9 && (
                <p className="text-xs text-[var(--color-suave)]">
                  + {categoriasGasto.length - 9} outra
                  {categoriasGasto.length - 9 === 1 ? "" : "s"} categoria
                  {categoriasGasto.length - 9 === 1 ? "" : "s"} ·{" "}
                  {moeda(
                    categoriasGasto.slice(9).reduce((s, c) => s + c.total, 0),
                  )}{" "}
                  ·{" "}
                  <Link
                    href="/transacoes"
                    className="text-[var(--color-verde)] underline"
                  >
                    ver tudo
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>

        <div className="painel">
          <div className="flex items-center justify-between gap-3">
            <p className="titulo-painel">Últimos lançamentos</p>
            <Link
              href="/transacoes"
              className="text-xs font-medium text-[var(--color-verde)]"
            >
              Ver todos
            </Link>
          </div>

          {doMes.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--color-suave)]">
              Nenhum lançamento neste mês.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-[var(--color-borda)]">
              {doMes.slice(0, 10).map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-sm"
                    style={{
                      backgroundColor: `${t.categorias?.cor ?? "#94a3b8"}22`,
                    }}
                  >
                    {t.categorias?.icone ?? "❔"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {t.descricao}
                    </span>
                    <span className="block text-xs text-[var(--color-suave)]">
                      {dataBR(t.data)} · {t.categorias?.nome ?? "Sem categoria"}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.tipo === "receita"
                        ? "text-[var(--color-verde)]"
                        : "text-[var(--color-texto)]"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : "−"}
                    {moeda(Number(t.valor))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}

function Cabecalho({ mes }: { mes: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Painel</h1>
        <p className="text-sm text-[var(--color-suave)]">
          Seu dinheiro, mês a mês.
        </p>
      </div>
      <SeletorMes mes={mes} maximo={mesAtual()} />
    </div>
  );
}
