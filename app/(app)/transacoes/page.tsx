import { createClient } from "@/lib/supabase/server";
import GerenciadorTransacoes from "@/components/GerenciadorTransacoes";
import { escaparLike, limitesDoMes, mesAtual, moeda } from "@/lib/formato";
import { somar } from "@/lib/agregacoes";
import SeletorMes from "@/components/SeletorMes";
import type { Categoria, Conta, TransacaoComCategoria } from "@/lib/tipos";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Transações · Minhas Finanças" };

export default async function PaginaTransacoes({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; categoria?: string; tipo?: string; busca?: string }>;
}) {
  const params = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(params.mes ?? "") ? params.mes! : mesAtual();
  const { inicio, fim } = limitesDoMes(mes);

  const supabase = await createClient();

  let consulta = supabase
    .from("transacoes")
    .select(
      "*, categorias(id,nome,cor,icone), contas!transacoes_conta_id_fkey(id,nome), contas_destino:contas!transacoes_conta_destino_id_fkey(id,nome)",
    )
    .gte("data", inicio)
    .lte("data", fim);

  if (params.categoria === "sem-categoria") {
    consulta = consulta.is("categoria_id", null);
  } else if (params.categoria) {
    consulta = consulta.eq("categoria_id", params.categoria);
  }
  if (params.tipo) consulta = consulta.eq("tipo", params.tipo);
  if (params.busca) {
    consulta = consulta.ilike("descricao", `%${escaparLike(params.busca)}%`);
  }

  const [{ data: transacoes }, { data: categorias }, { data: contas }] =
    await Promise.all([
      consulta.order("data", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("categorias").select("*").order("tipo").order("nome"),
      supabase.from("contas").select("*").eq("ativa", true).order("nome"),
    ]);

  const lista = (transacoes ?? []) as TransacaoComCategoria[];
  const receitas = somar(lista, "receita");
  const despesas = somar(lista, "despesa");

  const filtrosAtivos =
    !!params.categoria || !!params.tipo || !!params.busca;
  const querExportar = new URLSearchParams();
  querExportar.set("mes", mes);
  if (params.categoria) querExportar.set("categoria", params.categoria);
  if (params.tipo) querExportar.set("tipo", params.tipo);
  if (params.busca) querExportar.set("busca", params.busca);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Transações
          </h1>
          <p className="text-sm text-[var(--color-suave)]">
            {lista.length} lançamento{lista.length === 1 ? "" : "s"} ·{" "}
            <span className="text-[var(--color-verde)]">+{moeda(receitas)}</span>{" "}
            <span className="text-[var(--color-vermelho)]">−{moeda(despesas)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/exportar/transacoes?${querExportar.toString()}`}
            className="botao-secundario"
            title={
              filtrosAtivos
                ? "Baixa as transações filtradas nesta tela"
                : `Baixa as transações de ${mes}`
            }
          >
            Exportar CSV
          </a>
          <SeletorMes mes={mes} maximo={mesAtual()} />
        </div>
      </div>

      <div className="mt-5">
        <GerenciadorTransacoes
          transacoes={lista}
          categorias={(categorias ?? []) as Categoria[]}
          contas={(contas ?? []) as Conta[]}
          filtros={{
            categoria: params.categoria ?? "",
            tipo: params.tipo ?? "",
            busca: params.busca ?? "",
          }}
        />
      </div>
    </>
  );
}
