"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { dataBR, hojeISO, lerValorPositivo, moeda } from "@/lib/formato";
import { PreviaValor, Vazio } from "@/components/Ui";
import Modal from "@/components/Modal";
import { useListaComDesfazer } from "@/lib/useListaComDesfazer";
import type {
  Categoria,
  Conta,
  TipoTransacao,
  TransacaoComCategoria,
} from "@/lib/tipos";

type Filtros = { categoria: string; tipo: string; busca: string };

function comparadorTransacoes(a: TransacaoComCategoria, b: TransacaoComCategoria) {
  return b.data.localeCompare(a.data) || b.created_at.localeCompare(a.created_at);
}

export default function GerenciadorTransacoes({
  transacoes,
  categorias,
  contas,
  filtros,
}: {
  transacoes: TransacaoComCategoria[];
  categorias: Categoria[];
  contas: Conta[];
  filtros: Filtros;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [formularioAberto, setFormularioAberto] = useState(false);
  const [editando, setEditando] = useState<TransacaoComCategoria | null>(null);
  const [busca, setBusca] = useState(filtros.busca);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [categoriaBulk, setCategoriaBulk] = useState("");
  const [aplicandoBulk, setAplicandoBulk] = useState(false);
  const primeiraRenderizacao = useRef(true);

  const { itens, setItens, excluir } = useListaComDesfazer<TransacaoComCategoria>(
    transacoes,
  );

  function aplicarFiltro(chave: string, valor: string) {
    const novos = new URLSearchParams(params.toString());
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    // replace, não push: trocar filtro não deveria empilhar histórico — o
    // "voltar" do celular passava a rebobinar filtro por filtro em vez de
    // sair da tela.
    startTransition(() => {
      router.replace(`${pathname}?${novos.toString()}`);
    });
  }

  // Busca ao vivo, com uma pausa curta para não disparar uma consulta a
  // cada tecla — o Enter no formulário abaixo ainda funciona na hora.
  useEffect(() => {
    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }
    const temporizador = setTimeout(() => aplicarFiltro("busca", busca), 400);
    return () => clearTimeout(temporizador);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  const filtrosAtivos = !!filtros.categoria || !!filtros.tipo || !!filtros.busca;

  function limparFiltros() {
    setBusca("");
    startTransition(() => router.replace(pathname));
  }

  function pedirExclusao(t: TransacaoComCategoria) {
    excluir(t, {
      mensagem: `"${t.descricao}" excluído.`,
      comparador: comparadorTransacoes,
      aoExcluirDeVerdade: () => createClient().from("transacoes").delete().eq("id", t.id),
      aoErro: (mensagem) => setErro(mensagem),
    });
    setSelecionadas((atual) => {
      if (!atual.has(t.id)) return atual;
      const novo = new Set(atual);
      novo.delete(t.id);
      return novo;
    });
  }

  // Trocar a categoria de uma transação atualiza a tela na hora — antes cada
  // troca disparava um router.refresh() completo, e arrumar 20 transações
  // depois de uma importação virava 20 idas e voltas ao servidor.
  async function trocarCategoria(t: TransacaoComCategoria, categoriaId: string) {
    const categoria = categorias.find((c) => c.id === categoriaId) ?? null;
    setItens((atual) =>
      atual.map((x) =>
        x.id === t.id
          ? { ...x, categoria_id: categoriaId || null, categorizado_por: "manual", categorias: categoria }
          : x,
      ),
    );
    setErro(null);
    const { error } = await createClient()
      .from("transacoes")
      .update({ categoria_id: categoriaId || null, categorizado_por: "manual" })
      .eq("id", t.id);
    if (error) {
      setErro(error.message);
      setItens((atual) => atual.map((x) => (x.id === t.id ? t : x)));
    }
  }

  function alternarSelecao(id: string) {
    setSelecionadas((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const tiposSelecionados = new Set(
    itens.filter((t) => selecionadas.has(t.id)).map((t) => t.tipo),
  );
  const tipoBulk =
    tiposSelecionados.size === 1 ? [...tiposSelecionados][0] : null;
  const opcoesBulk = tipoBulk
    ? categorias.filter((c) => (tipoBulk === "receita" ? c.tipo === "receita" : c.tipo === "despesa"))
    : [];

  async function aplicarCategoriaEmLote() {
    if (selecionadas.size === 0 || !categoriaBulk) return;
    setAplicandoBulk(true);
    setErro(null);
    const ids = [...selecionadas];
    const categoria = categorias.find((c) => c.id === categoriaBulk) ?? null;
    const anteriores = itens.filter((x) => ids.includes(x.id));
    setItens((atual) =>
      atual.map((x) =>
        ids.includes(x.id)
          ? { ...x, categoria_id: categoriaBulk, categorizado_por: "manual", categorias: categoria }
          : x,
      ),
    );
    const { error } = await createClient()
      .from("transacoes")
      .update({ categoria_id: categoriaBulk, categorizado_por: "manual" })
      .in("id", ids);
    if (error) {
      setErro(error.message);
      setItens((atual) =>
        atual.map((x) => anteriores.find((a) => a.id === x.id) ?? x),
      );
    } else {
      setSelecionadas(new Set());
      setCategoriaBulk("");
    }
    setAplicandoBulk(false);
  }

  return (
    <div className="space-y-4">
      <div className="painel">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              aplicarFiltro("busca", busca);
            }}
          >
            <label className="rotulo" htmlFor="busca">
              Buscar
            </label>
            <div className="relative">
              <input
                id="busca"
                className="campo"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="iFood, aluguel..."
              />
              {isPending && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-suave)]">
                  Buscando…
                </span>
              )}
            </div>
          </form>

          <div>
            <label className="rotulo" htmlFor="filtro-tipo">
              Tipo
            </label>
            <select
              id="filtro-tipo"
              className="campo"
              value={filtros.tipo}
              onChange={(e) => aplicarFiltro("tipo", e.target.value)}
            >
              <option value="">Todos</option>
              <option value="despesa">Despesas</option>
              <option value="receita">Receitas</option>
              <option value="transferencia">Transferências</option>
            </select>
          </div>

          <div>
            <label className="rotulo" htmlFor="filtro-categoria">
              Categoria
            </label>
            <select
              id="filtro-categoria"
              className="campo"
              value={filtros.categoria}
              onChange={(e) => aplicarFiltro("categoria", e.target.value)}
            >
              <option value="">Todas</option>
              <option value="sem-categoria">Sem categoria</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setEditando(null);
                setFormularioAberto(true);
              }}
              className="botao w-full"
            >
              + Novo lançamento
            </button>
          </div>
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

      {selecionadas.size > 0 && (
        <div className="painel flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium">
            {selecionadas.size} selecionada{selecionadas.size === 1 ? "" : "s"}
          </p>
          {tipoBulk ? (
            <>
              <select
                value={categoriaBulk}
                onChange={(e) => setCategoriaBulk(e.target.value)}
                className="rounded-lg border border-[var(--color-borda)] bg-[var(--color-fundo)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-verde)]"
                aria-label="Categoria para aplicar às transações selecionadas"
              >
                <option value="">Escolher categoria</option>
                {opcoesBulk.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icone} {c.nome}
                  </option>
                ))}
              </select>
              <button
                onClick={aplicarCategoriaEmLote}
                disabled={!categoriaBulk || aplicandoBulk}
                className="botao"
              >
                {aplicandoBulk ? "Aplicando..." : "Aplicar"}
              </button>
            </>
          ) : (
            <p className="text-xs text-[var(--color-ambar)]">
              Selecione lançamentos do mesmo tipo para categorizar em lote.
            </p>
          )}
          <button
            onClick={() => setSelecionadas(new Set())}
            className="botao-secundario ml-auto"
          >
            Cancelar seleção
          </button>
        </div>
      )}

      {itens.length === 0 ? (
        <Vazio
          titulo="Nenhuma transação encontrada"
          descricao="Ajuste os filtros, importe um extrato ou cadastre um lançamento na mão."
          acao={
            filtrosAtivos ? (
              <button onClick={limparFiltros} className="botao-secundario">
                Limpar filtros
              </button>
            ) : (
              <button
                onClick={() => {
                  setEditando(null);
                  setFormularioAberto(true);
                }}
                className="botao"
              >
                + Novo lançamento
              </button>
            )
          }
        />
      ) : (
        <div className="painel p-0">
          <ul className="divide-y divide-[var(--color-borda)]">
            {itens.map((t) => {
              const opcoes = categorias.filter((c) =>
                t.tipo === "receita" ? c.tipo === "receita" : c.tipo === "despesa",
              );
              return (
                <li
                  key={t.id}
                  className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
                >
                  <input
                    type="checkbox"
                    checked={selecionadas.has(t.id)}
                    onChange={() => alternarSelecao(t.id)}
                    disabled={t.tipo === "transferencia"}
                    className="h-4 w-4 shrink-0 accent-[var(--color-verde)] disabled:opacity-30"
                    aria-label={`Selecionar ${t.descricao} de ${dataBR(t.data)} para ação em lote`}
                  />

                  <span
                    aria-hidden="true"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{
                      backgroundColor:
                        t.tipo === "transferencia"
                          ? "#4a9eff22"
                          : `${t.categorias?.cor ?? "#94a3b8"}22`,
                    }}
                  >
                    {t.tipo === "transferencia" ? "⇄" : (t.categorias?.icone ?? "❔")}
                  </span>

                  <div className="min-w-0 flex-1 basis-40">
                    <p className="truncate text-sm font-medium">{t.descricao}</p>
                    <p className="truncate text-xs text-[var(--color-suave)]">
                      {dataBR(t.data)}
                      {t.tipo === "transferencia"
                        ? t.contas?.nome && t.contas_destino?.nome
                          ? ` · ${t.contas.nome} → ${t.contas_destino.nome}`
                          : ""
                        : t.contas?.nome
                          ? ` · ${t.contas.nome}`
                          : ""}
                      {t.categorizado_por === "ia" ? " · IA" : ""}
                      {t.observacao ? ` · ${t.observacao}` : ""}
                    </p>
                    {t.descricao_original && (
                      <p
                        className="truncate text-[11px] text-[var(--color-suave)]/85"
                        title={t.descricao_original}
                      >
                        era: {t.descricao_original}
                      </p>
                    )}
                  </div>

                  <select
                    value={t.categoria_id ?? ""}
                    onChange={(e) => trocarCategoria(t, e.target.value)}
                    disabled={t.tipo === "transferencia"}
                    aria-label={`Categoria de ${t.descricao}`}
                    className="order-3 w-full rounded-lg border border-[var(--color-borda)] bg-[var(--color-fundo)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-verde)] disabled:opacity-40 sm:order-none sm:w-40"
                  >
                    <option value="">Sem categoria</option>
                    {opcoes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icone} {c.nome}
                      </option>
                    ))}
                  </select>

                  <span
                    className={`shrink-0 text-sm font-semibold tabular-nums ${
                      t.tipo === "receita"
                        ? "text-[var(--color-verde)]"
                        : t.tipo === "transferencia"
                          ? "text-[var(--color-azul)]"
                          : "text-[var(--color-texto)]"
                    }`}
                  >
                    {t.tipo === "receita" ? "+" : t.tipo === "despesa" ? "−" : ""}
                    {moeda(Number(t.valor))}
                  </span>

                  <span className="flex shrink-0 gap-2">
                    <button
                      onClick={() => {
                        setEditando(t);
                        setFormularioAberto(true);
                      }}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
                      aria-label={`Editar lançamento ${t.descricao} de ${dataBR(t.data)}`}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => pedirExclusao(t)}
                      className="rounded-lg px-3 py-2 text-xs text-[var(--color-suave)] transition hover:text-[var(--color-vermelho)]"
                      aria-label={`Excluir lançamento ${t.descricao} de ${dataBR(t.data)}`}
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

      {formularioAberto && (
        <ModalTransacao
          transacao={editando}
          categorias={categorias}
          contas={contas}
          aoFechar={() => setFormularioAberto(false)}
          aoSalvar={() => {
            setFormularioAberto(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function ModalTransacao({
  transacao,
  categorias,
  contas,
  aoFechar,
  aoSalvar,
}: {
  transacao: TransacaoComCategoria | null;
  categorias: Categoria[];
  contas: Conta[];
  aoFechar: () => void;
  aoSalvar: () => void;
}) {
  const [tipo, setTipo] = useState<TipoTransacao>(transacao?.tipo ?? "despesa");
  const [data, setData] = useState(transacao?.data ?? hojeISO());
  const [descricao, setDescricao] = useState(transacao?.descricao ?? "");
  const [valor, setValor] = useState(
    transacao ? String(Number(transacao.valor)) : "",
  );
  const [categoriaId, setCategoriaId] = useState(transacao?.categoria_id ?? "");
  const [contaId, setContaId] = useState(transacao?.conta_id ?? contas[0]?.id ?? "");
  const [contaDestinoId, setContaDestinoId] = useState(
    transacao?.conta_destino_id ?? "",
  );
  const [observacao, setObservacao] = useState(transacao?.observacao ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const opcoes = categorias.filter((c) =>
    tipo === "receita" ? c.tipo === "receita" : c.tipo === "despesa",
  );

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    const numero = lerValorPositivo(valor);
    if (numero === null) {
      setErro(
        `Não entendi "${valor}" como um valor. Use vírgula para os centavos, ex.: 149,90.`,
      );
      return;
    }
    if (tipo === "transferencia") {
      if (!contaId || !contaDestinoId) {
        setErro("Escolha a conta de origem e a de destino da transferência.");
        return;
      }
      if (contaId === contaDestinoId) {
        setErro("Origem e destino não podem ser a mesma conta.");
        return;
      }
    }

    setSalvando(true);
    setErro(null);
    const supabase = createClient();

    const campos = {
      data,
      descricao: descricao.trim() || "Sem descrição",
      valor: numero,
      tipo,
      categoria_id: tipo === "transferencia" ? null : categoriaId || null,
      conta_id: contaId || null,
      conta_destino_id: tipo === "transferencia" ? contaDestinoId || null : null,
      observacao: observacao.trim() || null,
      categorizado_por: "manual" as const,
    };

    if (transacao) {
      const { error } = await supabase
        .from("transacoes")
        .update(campos)
        .eq("id", transacao.id);
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
        .from("transacoes")
        .insert({ ...campos, user_id: user!.id, origem: "manual" });
      if (error) {
        setErro(error.message);
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
      labelledBy="titulo-modal-transacao"
      className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-5 sm:rounded-2xl"
    >
      <form onSubmit={enviar} className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="titulo-modal-transacao" className="text-lg font-bold">
            {transacao ? "Editar lançamento" : "Novo lançamento"}
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

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-[var(--color-fundo)] p-1">
          {(["despesa", "receita", "transferencia"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => {
                setTipo(opcao);
                setCategoriaId("");
              }}
              className={`rounded-lg py-2 text-xs font-semibold capitalize transition ${
                tipo === opcao
                  ? "bg-[var(--color-painel-alto)] text-[var(--color-texto)]"
                  : "text-[var(--color-suave)]"
              }`}
            >
              {opcao === "transferencia" ? "Transf." : opcao}
            </button>
          ))}
        </div>

        <div>
          <label className="rotulo" htmlFor="descricao">
            Descrição
          </label>
          <input
            id="descricao"
            className="campo"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Mercado do bairro"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo" htmlFor="valor">
              Valor (R$)
            </label>
            <input
              id="valor"
              className="campo"
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              placeholder="149,90"
              required
            />
            <PreviaValor texto={valor} />
          </div>
          <div>
            <label className="rotulo" htmlFor="data">
              Data
            </label>
            <input
              id="data"
              type="date"
              className="campo"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
            />
          </div>
        </div>

        {tipo !== "transferencia" && (
          <div>
            <label className="rotulo" htmlFor="categoria">
              Categoria
            </label>
            <select
              id="categoria"
              className="campo"
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
            >
              <option value="">Sem categoria</option>
              {opcoes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icone} {c.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={tipo === "transferencia" ? "grid grid-cols-2 gap-3" : undefined}>
          <div>
            <label className="rotulo" htmlFor="conta">
              {tipo === "transferencia" ? "De" : "Conta"}
            </label>
            <select
              id="conta"
              className="campo"
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
              required={tipo === "transferencia"}
            >
              <option value="">Sem conta</option>
              {contas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>

          {tipo === "transferencia" && (
            <div>
              <label className="rotulo" htmlFor="conta-destino">
                Para
              </label>
              <select
                id="conta-destino"
                className="campo"
                value={contaDestinoId}
                onChange={(e) => setContaDestinoId(e.target.value)}
                required
              >
                <option value="">Escolha a conta</option>
                {contas
                  .filter((c) => c.id !== contaId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="rotulo" htmlFor="observacao">
            Observação — opcional
          </label>
          <input
            id="observacao"
            className="campo"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="parcela 2 de 3, dividido com..."
          />
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
          <button
            type="button"
            onClick={aoFechar}
            className="botao-secundario flex-1"
          >
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
