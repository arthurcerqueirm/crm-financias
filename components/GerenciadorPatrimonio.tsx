"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataBR, hojeISO, lerValorPositivo, moeda } from "@/lib/formato";
import { PreviaValor, Vazio } from "@/components/Ui";
import type { Conta, RegistroPatrimonio } from "@/lib/tipos";

export default function GerenciadorPatrimonio({
  registros,
  contas,
}: {
  registros: RegistroPatrimonio[];
  contas: Conta[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"ativo" | "passivo">("ativo");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hojeISO().slice(0, 8) + "01");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Nomes já usados viram sugestão, para o histórico do mesmo ativo não quebrar.
  const nomesConhecidos = [
    ...new Set([...registros.map((r) => r.nome), ...contas.map((c) => c.nome)]),
  ];

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    const numero = lerValorPositivo(valor);
    if (numero === null) {
      setErro(
        `Não entendi "${valor}" como um valor. Use vírgula para os centavos, ex.: 12.500,00.`,
      );
      return;
    }
    if (!nome.trim()) {
      setErro("Dê um nome ao ativo (ex.: Nubank, Tesouro Direto, Financiamento).");
      return;
    }

    setSalvando(true);
    setErro(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Um registro por ativo por data: regravar o mesmo mês corrige o valor.
    const { error } = await supabase.from("patrimonio").upsert(
      {
        user_id: user!.id,
        nome: nome.trim(),
        tipo,
        valor: numero,
        data,
        conta_id: contas.find((c) => c.nome === nome.trim())?.id ?? null,
      },
      { onConflict: "user_id,nome,data" },
    );

    if (error) setErro(error.message);
    else {
      setValor("");
      setNome("");
      router.refresh();
    }
    setSalvando(false);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este registro?")) return;
    const { error } = await createClient().from("patrimonio").delete().eq("id", id);
    if (error) setErro(error.message);
    else router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <form onSubmit={salvar} className="painel space-y-4 lg:col-span-1">
        <p className="titulo-painel">Registrar saldo</p>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-fundo)] p-1">
          {(["ativo", "passivo"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                tipo === opcao
                  ? "bg-[var(--color-painel-alto)] text-[var(--color-texto)]"
                  : "text-[var(--color-suave)]"
              }`}
            >
              {opcao === "ativo" ? "Ativo" : "Dívida"}
            </button>
          ))}
        </div>

        <div>
          <label className="rotulo" htmlFor="nome-ativo">
            Nome
          </label>
          <input
            id="nome-ativo"
            className="campo"
            list="ativos-conhecidos"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={tipo === "ativo" ? "Nubank, Tesouro Selic..." : "Financiamento do carro"}
            required
          />
          <datalist id="ativos-conhecidos">
            {nomesConhecidos.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="valor-ativo">
              Valor (R$)
            </label>
            <input
              id="valor-ativo"
              className="campo"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="12.500,00"
              required
            />
            <PreviaValor texto={valor} />
          </div>
          <div>
            <label className="rotulo" htmlFor="data-ativo">
              Data
            </label>
            <input
              id="data-ativo"
              type="date"
              className="campo"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>
        </div>

        {erro && (
          <p className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
            {erro}
          </p>
        )}

        <button type="submit" disabled={salvando} className="botao w-full">
          {salvando ? "Salvando..." : "Salvar registro"}
        </button>

        <p className="text-xs text-[var(--color-suave)]">
          Repita todo mês com o mesmo nome para acompanhar a evolução. Regravar a
          mesma data substitui o valor anterior.
        </p>
      </form>

      <div className="lg:col-span-2">
        {registros.length === 0 ? (
          <Vazio
            titulo="Nenhum registro ainda"
            descricao="Comece pelo saldo das suas contas e investimentos neste mês."
          />
        ) : (
          <div className="painel p-0">
            <ul className="divide-y divide-[var(--color-borda)]">
              {registros.map((r) => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      r.tipo === "ativo"
                        ? "bg-[var(--color-verde)]"
                        : "bg-[var(--color-vermelho)]"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.nome}</p>
                    <p className="text-xs text-[var(--color-suave)]">
                      {dataBR(r.data)} · {r.tipo === "ativo" ? "Ativo" : "Dívida"}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      r.tipo === "ativo"
                        ? "text-[var(--color-texto)]"
                        : "text-[var(--color-vermelho)]"
                    }`}
                  >
                    {r.tipo === "passivo" && "−"}
                    {moeda(Number(r.valor))}
                  </span>
                  <button
                    onClick={() => excluir(r.id)}
                    className="shrink-0 px-1 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                  >
                    Excluir
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
