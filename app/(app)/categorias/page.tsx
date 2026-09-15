import { createClient } from "@/lib/supabase/server";
import GerenciadorCategorias from "@/components/GerenciadorCategorias";
import SeletorMes from "@/components/SeletorMes";
import { limitesDoMes, mesAtual } from "@/lib/formato";
import { porCategoria } from "@/lib/agregacoes";
import type { Categoria, TransacaoComCategoria } from "@/lib/tipos";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Categorias · Minhas Finanças" };

export default async function PaginaCategorias({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = /^\d{4}-\d{2}$/.test(mesParam ?? "") ? mesParam! : mesAtual();
  const { inicio, fim } = limitesDoMes(mes);

  const supabase = await createClient();
  const [{ data: categorias }, { data: transacoes }] = await Promise.all([
    supabase.from("categorias").select("*").order("tipo").order("nome"),
    supabase
      .from("transacoes")
      .select("*, categorias(id,nome,cor,icone), contas(id,nome)")
      .gte("data", inicio)
      .lte("data", fim),
  ]);

  const gastoDoMes = new Map(
    porCategoria((transacoes ?? []) as TransacaoComCategoria[], "despesa").map(
      (c) => [c.id, c.total],
    ),
  );

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
            Categorias
          </h1>
          <p className="mt-1 text-sm text-[var(--color-suave)]">
            As palavras-chave categorizam o extrato automaticamente na
            importação. O orçamento mensal aparece como alerta no painel.
          </p>
        </div>
        <SeletorMes mes={mes} maximo={mesAtual()} />
      </div>

      <div className="mt-5">
        <GerenciadorCategorias
          categorias={(categorias ?? []) as Categoria[]}
          gastoDoMes={Object.fromEntries(gastoDoMes)}
        />
      </div>
    </>
  );
}
