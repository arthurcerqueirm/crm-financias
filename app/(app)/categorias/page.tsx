import { createClient } from "@/lib/supabase/server";
import GerenciadorCategorias from "@/components/GerenciadorCategorias";
import { limitesDoMes, mesAtual } from "@/lib/formato";
import { porCategoria } from "@/lib/agregacoes";
import type { Categoria, TransacaoComCategoria } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaCategorias() {
  const supabase = await createClient();
  const { inicio, fim } = limitesDoMes(mesAtual());

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
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Categorias</h1>
      <p className="mt-1 text-sm text-[var(--color-suave)]">
        As palavras-chave categorizam o extrato automaticamente na importação. O
        orçamento mensal aparece como alerta no painel.
      </p>

      <div className="mt-5">
        <GerenciadorCategorias
          categorias={(categorias ?? []) as Categoria[]}
          gastoDoMes={Object.fromEntries(gastoDoMes)}
        />
      </div>
    </>
  );
}
