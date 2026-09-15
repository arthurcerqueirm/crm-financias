"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PreviaValor } from "@/components/Ui";
import Modal from "@/components/Modal";
import { useListaComDesfazer } from "@/lib/useListaComDesfazer";
import { lerValorPositivo, moeda } from "@/lib/formato";
import type { Categoria, TipoCategoria } from "@/lib/tipos";

const CORES: { valor: string; nome: string }[] = [
  { valor: "#ef4444", nome: "Vermelho" },
  { valor: "#f97316", nome: "Laranja" },
  { valor: "#eab308", nome: "Amarelo" },
  { valor: "#84cc16", nome: "Verde-limão" },
  { valor: "#22c55e", nome: "Verde" },
  { valor: "#14b8a6", nome: "Turquesa" },
  { valor: "#06b6d4", nome: "Ciano" },
  { valor: "#3b82f6", nome: "Azul" },
  { valor: "#6366f1", nome: "Índigo" },
  { valor: "#8b5cf6", nome: "Violeta" },
  { valor: "#d946ef", nome: "Magenta" },
  { valor: "#ec4899", nome: "Rosa" },
  { valor: "#64748b", nome: "Cinza" },
  { valor: "#2ecc8f", nome: "Verde-menta" },
];

export default function GerenciadorCategorias({
  categorias,
  gastoDoMes,
}: {
  categorias: Categoria[];
  gastoDoMes: Record<string, number>;
}) {
  const router = useRouter();
  const [editando, setEditando] = useState<Categoria | null>(null);
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const { itens, excluir } = useListaComDesfazer<Categoria>(categorias);
  const despesas = itens.filter((c) => c.tipo === "despesa");
  const receitas = itens.filter((c) => c.tipo === "receita");

  function pedirExclusao(categoria: Categoria) {
    excluir(categoria, {
      mensagem: `"${categoria.nome}" excluída. As transações dela ficam sem categoria.`,
      comparador: (a, b) => a.nome.localeCompare(b.nome),
      aoExcluirDeVerdade: () =>
        createClient().from("categorias").delete().eq("id", categoria.id),
      aoErro: (mensagem) => setErro(mensagem),
    });
  }

  function Grupo({ titulo, itens: lista }: { titulo: string; itens: Categoria[] }) {
    return (
      <div className="painel">
        <p className="titulo-painel">{titulo}</p>
        {lista.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-suave)]">Nenhuma categoria.</p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--color-borda)]">
            {lista.map((c) => {
              const gasto = gastoDoMes[c.id] ?? 0;
              const estourou = c.orcamento_mensal ? gasto > c.orcamento_mensal : false;
              return (
                <li key={c.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ backgroundColor: `${c.cor}22` }}
                  >
                    {c.icone}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.nome}</p>
                    <p className="truncate text-xs text-[var(--color-suave)]">
                      {c.palavras_chave.length > 0
                        ? `${c.palavras_chave.length} palavra${c.palavras_chave.length === 1 ? "" : "s"}-chave`
                        : "sem palavras-chave"}
                      {c.orcamento_mensal != null && (
                        <span className={estourou ? " text-[var(--color-vermelho)]" : ""}>
                          {" · "}
                          {moeda(gasto)} de {moeda(c.orcamento_mensal)}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditando(c)}
                    className="rounded-lg px-2.5 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
                    aria-label={`Editar categoria ${c.nome}`}
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => pedirExclusao(c)}
                    className="rounded-lg px-2.5 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                    aria-label={`Excluir categoria ${c.nome}`}
                  >
                    Excluir
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setCriando(true)} className="botao">
        + Nova categoria
      </button>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
          {erro}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Grupo titulo="Despesas" itens={despesas} />
        <Grupo titulo="Receitas" itens={receitas} />
      </div>

      {(editando || criando) && (
        <ModalCategoria
          categoria={editando}
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

function ModalCategoria({
  categoria,
  aoFechar,
  aoSalvar,
}: {
  categoria: Categoria | null;
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [nome, setNome] = useState(categoria?.nome ?? "");
  const [tipo, setTipo] = useState<TipoCategoria>(categoria?.tipo ?? "despesa");
  const [cor, setCor] = useState(categoria?.cor ?? "#64748b");
  const [icone, setIcone] = useState(categoria?.icone ?? "📦");
  const [palavras, setPalavras] = useState(
    (categoria?.palavras_chave ?? []).join(", "),
  );
  const [orcamento, setOrcamento] = useState(
    categoria?.orcamento_mensal != null ? String(categoria.orcamento_mensal) : "",
  );
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvando(true);
    setErro(null);

    const supabase = createClient();
    const valorOrcamento = orcamento.trim() ? lerValorPositivo(orcamento) : null;

    if (orcamento.trim() && valorOrcamento === null) {
      setErro(
        `Não entendi "${orcamento}" como um valor. Use vírgula para os centavos, ex.: 800,00.`,
      );
      setSalvando(false);
      return;
    }

    const campos = {
      nome: nome.trim(),
      tipo,
      cor,
      icone: icone.trim() || "📦",
      palavras_chave: palavras
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean),
      orcamento_mensal: valorOrcamento,
    };

    if (categoria) {
      const { error } = await supabase
        .from("categorias")
        .update(campos)
        .eq("id", categoria.id);
      if (error) {
        setErro(error.message);
        setSalvando(false);
        return;
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("categorias")
        .insert({ ...campos, user_id: user!.id });
      if (error) {
        setErro(
          error.code === "23505"
            ? "Já existe uma categoria com esse nome."
            : error.message,
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
      labelledBy="titulo-modal-categoria"
      className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-5 sm:rounded-2xl"
    >
      <form onSubmit={enviar} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="titulo-modal-categoria" className="text-lg font-bold">
            {categoria ? "Editar categoria" : "Nova categoria"}
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

        <div className="grid grid-cols-[4.5rem_1fr] gap-3">
          <div>
            <label className="rotulo" htmlFor="icone">
              Ícone
            </label>
            <input
              id="icone"
              className="campo text-center text-lg"
              value={icone}
              onChange={(e) => setIcone(e.target.value)}
              maxLength={4}
            />
          </div>
          <div>
            <label className="rotulo" htmlFor="nome-cat">
              Nome
            </label>
            <input
              id="nome-cat"
              className="campo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-fundo)] p-1">
          {(["despesa", "receita"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              className={`rounded-lg py-2 text-xs font-semibold capitalize transition ${
                tipo === opcao
                  ? "bg-[var(--color-painel-alto)] text-[var(--color-texto)]"
                  : "text-[var(--color-suave)]"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>

        <div>
          <span className="rotulo">Cor</span>
          <div className="flex flex-wrap gap-2">
            {CORES.map((opcao) => (
              <button
                key={opcao.valor}
                type="button"
                onClick={() => setCor(opcao.valor)}
                aria-label={`Cor ${opcao.nome}`}
                aria-pressed={cor === opcao.valor}
                className={`h-7 w-7 rounded-full transition ${
                  cor === opcao.valor
                    ? "ring-2 ring-[var(--color-texto)] ring-offset-2 ring-offset-[var(--color-painel)]"
                    : ""
                }`}
                style={{ backgroundColor: opcao.valor }}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="rotulo" htmlFor="palavras">
            Palavras-chave (separadas por vírgula)
          </label>
          <textarea
            id="palavras"
            className="campo min-h-20 resize-y"
            value={palavras}
            onChange={(e) => setPalavras(e.target.value)}
            placeholder="ifood, restaurante, padaria"
          />
          <p className="mt-1 text-xs text-[var(--color-suave)]">
            Se a descrição do extrato contiver qualquer uma delas, a transação cai
            nesta categoria.
          </p>
        </div>

        {tipo === "despesa" && (
          <div>
            <label className="rotulo" htmlFor="orcamento">
              Orçamento mensal (R$) — opcional
            </label>
            <input
              id="orcamento"
              className="campo"
              inputMode="decimal"
              value={orcamento}
              onChange={(e) => setOrcamento(e.target.value)}
              placeholder="800,00"
            />
            <PreviaValor texto={orcamento} />
          </div>
        )}

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
