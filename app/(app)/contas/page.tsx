import { createClient } from "@/lib/supabase/server";
import GerenciadorContas from "@/components/GerenciadorContas";
import type { Conta } from "@/lib/tipos";

export const dynamic = "force-dynamic";

export default async function PaginaContas() {
  const supabase = await createClient();

  const [{ data: contas }, { data: transacoes }] = await Promise.all([
    supabase.from("contas").select("*").order("ativa", { ascending: false }).order("nome"),
    // Só o necessário para somar o saldo atual de cada conta.
    supabase.from("transacoes").select("conta_id, valor, tipo"),
  ]);

  const saldosPorConta = new Map<string, number>();
  for (const t of transacoes ?? []) {
    if (!t.conta_id || t.tipo === "transferencia") continue;
    const atual = saldosPorConta.get(t.conta_id) ?? 0;
    const delta = t.tipo === "receita" ? Number(t.valor) : -Number(t.valor);
    saldosPorConta.set(t.conta_id, atual + delta);
  }

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Contas</h1>
      <p className="mt-1 text-sm text-[var(--color-suave)]">
        Cada banco, cartão ou carteira que você usa. O saldo atual é o saldo
        inicial mais tudo que entrou e saiu por lançamentos dessa conta.
      </p>

      <div className="mt-5">
        <GerenciadorContas
          contas={(contas ?? []) as Conta[]}
          saldosPorConta={Object.fromEntries(saldosPorConta)}
        />
      </div>
    </>
  );
}
