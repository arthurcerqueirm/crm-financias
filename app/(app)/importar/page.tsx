import { createClient } from "@/lib/supabase/server";
import PainelImportacao from "@/components/PainelImportacao";
import HistoricoImportacoes, {
  type ImportacaoHistorico,
} from "@/components/HistoricoImportacoes";
import type { Categoria, Conta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaImportar() {
  const supabase = await createClient();
  const [{ data: contas }, { data: categorias }, { data: importacoes }] =
    await Promise.all([
      supabase.from("contas").select("*").eq("ativa", true).order("nome"),
      supabase.from("categorias").select("*").order("tipo").order("nome"),
      supabase
        .from("importacoes")
        .select("id, arquivo_nome, total_linhas, total_importado, total_duplicado, created_at, contas(nome)")
        .order("created_at", { ascending: false })
        .limit(15),
    ]);

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
        Importar extrato
      </h1>
      <p className="mt-1 text-sm text-[var(--color-suave)]">
        Exporte o extrato do seu banco em CSV, OFX ou PDF e solte o arquivo aqui. As
        transações já vêm categorizadas, e o que se repete não entra duas vezes.
      </p>

      <div className="mt-5 space-y-4">
        <PainelImportacao
          contas={(contas ?? []) as Conta[]}
          categorias={(categorias ?? []) as Categoria[]}
        />
        <HistoricoImportacoes
          importacoes={(importacoes ?? []) as unknown as ImportacaoHistorico[]}
        />
      </div>
    </>
  );
}
