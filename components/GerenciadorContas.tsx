"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { lerValor, moeda } from "@/lib/formato";
import { PreviaValor, Vazio } from "@/components/Ui";
import Modal from "@/components/Modal";
import { useListaComDesfazer } from "@/lib/useListaComDesfazer";
import type { Conta } from "@/lib/tipos";

const TIPOS: { valor: Conta["tipo"]; rotulo: string }[] = [
  { valor: "corrente", rotulo: "Conta corrente" },
  { valor: "poupanca", rotulo: "Poupança" },
  { valor: "cartao", rotulo: "Cartão de crédito" },
  { valor: "investimento", rotulo: "Investimento" },
  { valor: "dinheiro", rotulo: "Dinheiro" },
  { valor: "outro", rotulo: "Outro" },
];

const ROTULO_TIPO = Object.fromEntries(TIPOS.map((t) => [t.valor, t.rotulo]));

export default function GerenciadorContas({
  contas,
  saldosPorConta,
}: {
  contas: Conta[];
  saldosPorConta: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Conta | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ocupada, setOcupada] = useState<string | null>(null);

  const { itens, excluir } = useListaComDesfazer<Conta>(contas);

  async function alternarAtiva(conta: Conta) {
    setOcupada(conta.id);
    setErro(null);
    const { error } = await createClient()
      .from("contas")
      .update({ ativa: !conta.ativa })
      .eq("id", conta.id);
    if (error) setErro(error.message);
    else router.refresh();
    setOcupada(null);
  }

  function pedirExclusao(conta: Conta) {
    excluir(conta, {
      mensagem: `"${conta.nome}" excluída.`,
      comparador: (a, b) =>
        Number(b.ativa) - Number(a.ativa) || a.nome.localeCompare(b.nome),
      aoExcluirDeVerdade: () => createClient().from("contas").delete().eq("id", conta.id),
      aoErro: (mensagem) => setErro(mensagem),
    });
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setCriando(true)} className="botao">
        + Nova conta
      </button>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
          {erro}
        </p>
      )}

      {itens.length === 0 ? (
        <Vazio
          titulo="Nenhuma conta cadastrada"
          descricao="Crie sua primeira conta para importar extratos e registrar patrimônio."
          acao={
            <button onClick={() => setCriando(true)} className="botao">
              + Nova conta
            </button>
          }
        />
      ) : (
        <div className="painel p-0">
          <ul className="divide-y divide-[var(--color-borda)]">
            {itens.map((c) => {
              const saldo = (c.saldo_inicial ?? 0) + (saldosPorConta[c.id] ?? 0);
              return (
                <li
                  key={c.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                    ocupada === c.id ? "opacity-50" : ""
                  } ${!c.ativa ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{c.nome}</span>
                      {!c.ativa && (
                        <span className="chip shrink-0 text-[var(--color-suave)]">
                          Inativa
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-[var(--color-suave)]">
                      {ROTULO_TIPO[c.tipo] ?? c.tipo}
                      {c.instituicao ? ` · ${c.instituicao}` : ""}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      saldo < 0 ? "text-[var(--color-vermelho)]" : ""
                    }`}
                  >
                    {moeda(saldo)}
                  </span>

                  <span className="flex shrink-0 gap-2">
                    <button
                      onClick={() => setEditando(c)}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
                      aria-label={`Editar conta ${c.nome}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => alternarAtiva(c)}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
                      aria-label={`${c.ativa ? "Desativar" : "Reativar"} conta ${c.nome}`}
                    >
                      {c.ativa ? "Desativar" : "Reativar"}
                    </button>
                    <button
                      onClick={() => pedirExclusao(c)}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                      aria-label={`Excluir conta ${c.nome}`}
                    >
                      Excluir
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(editando || criando) && (
        <ModalConta
          conta={editando}
          aoFechar={() => {
            setEditando(null);
            setCriando(false);
          }}
          aoSalvar={() => {
            setEditando(null);
            setCriando(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalConta({
  conta,
  aoFechar,
  aoSalvar,
}: {
  conta: Conta | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [nome, setNome] = useState(conta?.nome ?? "");
  const [tipo, setTipo] = useState<Conta["tipo"]>(conta?.tipo ?? "corrente");
  const [instituicao, setInstituicao] = useState(conta?.instituicao ?? "");
  const [saldoInicial, setSaldoInicial] = useState(
    conta ? String(conta.saldo_inicial) : "0",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();

    let saldo = 0;
    if (saldoInicial.trim() && saldoInicial.trim() !== "0") {
      // lerValor (não lerValorPositivo): saldo inicial negativo é válido —
      // cartão com fatura aberta, conta no cheque especial.
      const numero = lerValor(saldoInicial);
      if (numero === null) {
        setErro(`Não entendi "${saldoInicial}" como um valor.`);
        return;
      }
      saldo = numero;
    }

    setSalvando(true);
    setErro(null);
    const supabase = createClient();

    const campos = {
      nome: nome.trim(),
      tipo,
      instituicao: instituicao.trim() || null,
      saldo_inicial: saldo,
    };

    if (conta) {
      const { error } = await supabase.from("contas").update(campos).eq("id", conta.id);
      if (error) {
        setErro(
          error.code === "23505" ? "Já existe uma conta com esse nome." : error.message,
        );
        setSalvando(false);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("contas")
        .insert({ ...campos, user_id: user!.id, ativa: true });
      if (error) {
        setErro(
          error.code === "23505" ? "Já existe uma conta com esse nome." : error.message,
        );
        setSalvando(false);
        return;
      }
    }

    aoSalvar();
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      posicionamento="base"
      labelledBy="titulo-modal-conta"
      className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-5 sm:rounded-2xl"
    >
      <form onSubmit={enviar} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="titulo-modal-conta" className="text-lg font-bold">
            {conta ? "Editar conta" : "Nova conta"}
          </h2>
          <button
            type="button"
            onClick={aoFechar}
            className="text-xl leading-none text-[var(--color-suave)]"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        <div>
          <label className="rotulo" htmlFor="nome-conta">
            Nome
          </label>
          <input
            id="nome-conta"
            className="campo"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nubank, Itaú, Carteira..."
            required
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="tipo-conta">
            Tipo
          </label>
          <select
            id="tipo-conta"
            className="campo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as Conta["tipo"])}
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="rotulo" htmlFor="instituicao">
            Instituição — opcional
          </label>
          <input
            id="instituicao"
            className="campo"
            value={instituicao}
            onChange={(e) => setInstituicao(e.target.value)}
            placeholder="Nubank S.A."
          />
        </div>

        <div>
          <label className="rotulo" htmlFor="saldo-inicial">
            Saldo inicial (R$)
          </label>
          <input
            id="saldo-inicial"
            className="campo"
            inputMode="decimal"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(e.target.value)}
            placeholder="0,00"
          />
          <PreviaValor texto={saldoInicial} permitirNegativo />
          <p className="mt-1 text-xs text-[var(--color-suave)]">
            O saldo que a conta já tinha antes de você começar a usar o app. Pode
            ser negativo — cartão com fatura aberta, cheque especial usado.
          </p>
        </div>

        {erro && (
          <p
            role="alert"
            className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
          >
            {erro}
          </p>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={aoFechar} className="botao-secundario flex-1">
            Cancelar
          </button>
          <button type="submit" disabled={salvando} className="botao flex-1">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
