"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataBR, lerValorPositivo, mesLongo, moeda } from "@/lib/formato";
import { mesDa } from "@/lib/agregacoes";
import { PreviaValor, Vazio } from "@/components/Ui";
import { useListaComDesfazer } from "@/lib/useListaComDesfazer";
import type { Conta, RegistroPatrimonio } from "@/lib/tipos";

export default function GerenciadorPatrimonio({
  registros,
  contas,
  mes,
}: {
  registros: RegistroPatrimonio[];
  contas: Conta[];
  /** Mês selecionado na tela (SeletorMes) — o formulário registra saldo nele, não sempre no mês atual. */
  mes: string;
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"ativo" | "passivo">("ativo");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(`${mes}-01`);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Quando a pessoa troca o mês no topo da página, o formulário passa a
  // registrar naquele mês — antes ficava sempre preso no mês corrente,
  // então dava para navegar até julho, preencher o formulário e o registro
  // cair em setembro sem nenhum aviso.
  useEffect(() => {
    setData(`${mes}-01`);
  }, [mes]);

  const { itens, excluir } = useListaComDesfazer<RegistroPatrimonio>(registros);

  // Nomes já usados viram sugestão, para o histórico do mesmo ativo não quebrar.
  const nomesConhecidos = [
    ...new Set([...registros.map((r) => r.nome), ...contas.map((c) => c.nome)]),
  ];

  const gruposPorMes = useMemo(() => {
    const mapa = new Map<string, RegistroPatrimonio[]>();
    for (const r of itens) {
      const chave = mesDa(r.data);
      if (!mapa.has(chave)) mapa.set(chave, []);
      mapa.get(chave)!.push(r);
    }
    return [...mapa.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [itens]);

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

  function pedirExclusao(registro: RegistroPatrimonio) {
    excluir(registro, {
      mensagem: `"${registro.nome}" excluído.`,
      comparador: (a, b) => b.data.localeCompare(a.data),
      aoExcluirDeVerdade: () =>
        createClient().from("patrimonio").delete().eq("id", registro.id),
      aoErro: (mensagem) => setErro(mensagem),
    });
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
          <p
            role="alert"
            className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
          >
            {erro}
          </p>
        )}

        <button type="submit" disabled={salvando} className="botao w-full">
          {salvando ? "Salvando..." : `Salvar em ${mesLongo(mes)}`}
        </button>

        <p className="text-xs text-[var(--color-suave)]">
          Repita todo mês com o mesmo nome para acompanhar a evolução. Regravar a
          mesma data substitui o valor anterior.
        </p>
      </form>

      <div className="lg:col-span-2">
        {itens.length === 0 ? (
          <Vazio
            titulo="Nenhum registro ainda"
            descricao="Comece pelo saldo das suas contas e investimentos neste mês."
          />
        ) : (
          <div className="space-y-4">
            {gruposPorMes.map(([chaveMes, registrosDoMes]) => (
              <div
                key={chaveMes}
                className={`painel p-0 ${
                  chaveMes === mes ? "ring-1 ring-[var(--color-verde)]/40" : ""
                }`}
              >
                <p className="titulo-painel flex items-center gap-2 px-4 pt-3">
                  {mesLongo(chaveMes)}
                  {chaveMes === mes && (
                    <span className="chip text-[var(--color-verde)]">mês atual da tela</span>
                  )}
                </p>
                <ul className="mt-1 divide-y divide-[var(--color-borda)]">
                  {registrosDoMes.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 px-4 py-3">
                      <span
                        aria-hidden="true"
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
                        onClick={() => pedirExclusao(r)}
                        aria-label={`Excluir registro de ${r.nome} em ${dataBR(r.data)}`}
                        className="shrink-0 rounded-lg px-2.5 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                      >
                        Excluir
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
