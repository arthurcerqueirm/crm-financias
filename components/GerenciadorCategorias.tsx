"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { moeda } from "@/lib/formato";
import type { Categoria, TipoCategoria } from "@/lib/tipos";

const CORES = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#22c55e", "#14b8a6",
  "#06b6d4", "#3b82f6", "#6366f1", "#8b5cf6", "#d946ef", "#ec4899",
  "#64748b", "#2ecc8f",
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

  const despesas = categorias.filter((c) => c.tipo === "despesa");
  const receitas = categorias.filter((c) => c.tipo === "receita");

  async function excluir(categoria: Categoria) {
    if (
      !confirm(
        `Excluir "${categoria.nome}"? As transações dela ficam sem categoria.`,
      )
    )
      return;
    const { error } = await createClient()
      .from("categorias")
      .delete()
      .eq("id", categoria.id);
    if (error) setErro(error.message);
    else router.refresh();
  }

  function Grupo({ titulo, itens }: { titulo: string; itens: Categoria[] }) {
    return (
      <div className="painel">
        <p className="titulo-painel">{titulo}</p>
        <ul className="mt-3 divide-y divide-[var(--color-borda)]">
          {itens.map((c) => {
            const gasto = gastoDoMes[c.id] ?? 0;
            const estourou = c.orcamento_mensal ? gasto > c.orcamento_mensal : false;
            return (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                <span
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
                  className="px-1 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
                >
                  Editar
                </button>
                <button
                  onClick={() => excluir(c)}
                  className="px-1 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                >
                  Excluir
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setCriando(true)} className="botao">
        + Nova categoria
      </button>

      {erro && (
        <p className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
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
    const valorOrcamento = orcamento.trim()
      ? Number(orcamento.replace(/\./g, "").replace(",", "."))
      : null;

    if (valorOrcamento != null && !Number.isFinite(valorOrcamento)) {
      setErro("Orçamento inválido.");
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={aoFechar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
        className="max-h-[92vh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-5 sm:rounded-2xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">
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
                key={opcao}
                type="button"
                onClick={() => setCor(opcao)}
                aria-label={`Cor ${opcao}`}
                className={`h-7 w-7 rounded-full transition ${
                  cor === opcao
                    ? "ring-2 ring-[var(--color-texto)] ring-offset-2 ring-offset-[var(--color-painel)]"
                    : ""
                }`}
                style={{ backgroundColor: opcao }}
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
          </div>
        )}

        {erro && (
          <p className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
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
    </div>
  );
}
