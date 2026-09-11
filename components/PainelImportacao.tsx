"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { dataBR, moeda } from "@/lib/formato";
import type { Categoria, Conta, LinhaExtrato } from "@/lib/tipos";

type Analise = {
  linhas: LinhaExtrato[];
  formato: string;
  ignoradas: number;
  duplicadas: number;
  usouIA: boolean;
  avisoIA: string | null;
  arquivo: string;
};

export default function PainelImportacao({
  contas,
  categorias,
}: {
  contas: Conta[];
  categorias: Categoria[];
}) {
  const router = useRouter();
  const inputArquivo = useRef<HTMLInputElement>(null);

  const [contaId, setContaId] = useState<string>(contas[0]?.id ?? "");
  const [usarIA, setUsarIA] = useState(true);
  const [arrastando, setArrastando] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [ignoradas, setIgnoradas] = useState<Set<number>>(new Set());

  async function enviar(arquivo: File) {
    setCarregando(true);
    setErro(null);
    setSucesso(null);
    setAnalise(null);
    setIgnoradas(new Set());

    const dados = new FormData();
    dados.append("arquivo", arquivo);
    dados.append("usarIA", String(usarIA));

    try {
      const resposta = await fetch("/api/importar/analisar", {
        method: "POST",
        body: dados,
      });
      const json = await resposta.json();
      if (!resposta.ok) {
        setErro(json.erro ?? "Não consegui ler o arquivo.");
      } else {
        setAnalise(json as Analise);
      }
    } catch {
      setErro("Falha de conexão ao enviar o arquivo.");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmar() {
    if (!analise) return;
    setSalvando(true);
    setErro(null);

    const paraSalvar = analise.linhas.filter(
      (linha, indice) => !linha.duplicada && !ignoradas.has(indice),
    );

    try {
      const resposta = await fetch("/api/importar/salvar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linhas: paraSalvar,
          conta_id: contaId || null,
          arquivo: analise.arquivo,
        }),
      });
      const json = await resposta.json();
      if (!resposta.ok) {
        setErro(json.erro ?? "Não consegui salvar as transações.");
      } else {
        setSucesso(
          `${json.importadas} transaç${json.importadas === 1 ? "ão importada" : "ões importadas"} com sucesso.`,
        );
        setAnalise(null);
        if (inputArquivo.current) inputArquivo.current.value = "";
        router.refresh();
      }
    } catch {
      setErro("Falha de conexão ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function trocarCategoria(indice: number, categoriaId: string) {
    if (!analise) return;
    const categoria = categorias.find((c) => c.id === categoriaId);
    const linhas = [...analise.linhas];
    linhas[indice] = {
      ...linhas[indice],
      categoria_id: categoria?.id ?? null,
      categoria_nome: categoria?.nome ?? null,
      categorizado_por: "manual",
    };
    setAnalise({ ...analise, linhas });
  }

  function alternar(indice: number) {
    const novas = new Set(ignoradas);
    if (novas.has(indice)) novas.delete(indice);
    else novas.add(indice);
    setIgnoradas(novas);
  }

  const selecionadas =
    analise?.linhas.filter((l, i) => !l.duplicada && !ignoradas.has(i)) ?? [];

  return (
    <div className="space-y-4">
      <div className="painel space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="rotulo" htmlFor="conta">
              Conta de destino
            </label>
            <select
              id="conta"
              className="campo"
              value={contaId}
              onChange={(e) => setContaId(e.target.value)}
            >
              {contas.length === 0 && <option value="">Sem conta</option>}
              {contas.map((conta) => (
                <option key={conta.id} value={conta.id}>
                  {conta.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={usarIA}
                onChange={(e) => setUsarIA(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[var(--color-verde)]"
              />
              <span>
                Categorizar com IA
                <span className="block text-xs text-[var(--color-suave)]">
                  Só para o que as regras não reconhecerem.
                </span>
              </span>
            </label>
          </div>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setArrastando(true);
          }}
          onDragLeave={() => setArrastando(false)}
          onDrop={(e) => {
            e.preventDefault();
            setArrastando(false);
            const arquivo = e.dataTransfer.files?.[0];
            if (arquivo) enviar(arquivo);
          }}
          onClick={() => inputArquivo.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
            arrastando
              ? "border-[var(--color-verde)] bg-[var(--color-verde)]/5"
              : "border-[var(--color-borda)] hover:border-[var(--color-suave)]/50"
          }`}
        >
          <input
            ref={inputArquivo}
            type="file"
            accept=".csv,.ofx,.txt,text/csv,text/plain"
            className="hidden"
            onChange={(e) => {
              const arquivo = e.target.files?.[0];
              if (arquivo) enviar(arquivo);
            }}
          />
          {carregando ? (
            <p className="text-sm font-medium text-[var(--color-verde)]">
              Lendo e categorizando...
            </p>
          ) : (
            <>
              <p className="text-sm font-semibold">
                Arraste o extrato aqui ou toque para escolher
              </p>
              <p className="mt-1 text-xs text-[var(--color-suave)]">
                CSV ou OFX · até 6 MB
              </p>
            </>
          )}
        </div>

        {erro && (
          <p className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
            {erro}
          </p>
        )}
        {sucesso && (
          <p className="rounded-xl border border-[var(--color-verde)]/30 bg-[var(--color-verde)]/10 px-3 py-2.5 text-sm text-[var(--color-verde)]">
            {sucesso}
          </p>
        )}
      </div>

      {analise && (
        <div className="painel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">
                {selecionadas.length} transaç
                {selecionadas.length === 1 ? "ão" : "ões"} para importar
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-suave)]">
                {analise.formato.toUpperCase()} · {analise.linhas.length} linhas
                lidas
                {analise.duplicadas > 0 &&
                  ` · ${analise.duplicadas} já importada${analise.duplicadas === 1 ? "" : "s"}`}
                {analise.ignoradas > 0 &&
                  ` · ${analise.ignoradas} linha${analise.ignoradas === 1 ? "" : "s"} sem data válida`}
                {analise.usouIA && " · categorizado com IA"}
              </p>
            </div>
            <button
              onClick={confirmar}
              disabled={salvando || selecionadas.length === 0}
              className="botao"
            >
              {salvando ? "Importando..." : "Confirmar importação"}
            </button>
          </div>

          {analise.avisoIA && (
            <p className="mt-3 rounded-xl border border-[var(--color-ambar)]/30 bg-[var(--color-ambar)]/10 px-3 py-2.5 text-sm text-[var(--color-ambar)]">
              {analise.avisoIA}
            </p>
          )}

          <div className="mt-4 max-h-[28rem] overflow-y-auto rounded-xl border border-[var(--color-borda)]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--color-painel-alto)] text-left text-xs text-[var(--color-suave)]">
                <tr>
                  <th className="w-10 px-3 py-2.5"></th>
                  <th className="px-2 py-2.5 font-medium">Data</th>
                  <th className="px-2 py-2.5 font-medium">Descrição</th>
                  <th className="px-2 py-2.5 font-medium">Categoria</th>
                  <th className="px-3 py-2.5 text-right font-medium">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-borda)]">
                {analise.linhas.map((linha, indice) => {
                  const fora = linha.duplicada || ignoradas.has(indice);
                  const opcoes = categorias.filter((c) =>
                    linha.tipo === "receita"
                      ? c.tipo === "receita"
                      : c.tipo === "despesa",
                  );

                  return (
                    <tr
                      key={linha.hash_dedup}
                      className={fora ? "opacity-40" : undefined}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={!fora}
                          disabled={linha.duplicada}
                          onChange={() => alternar(indice)}
                          className="h-4 w-4 accent-[var(--color-verde)]"
                          aria-label={`Incluir ${linha.descricao}`}
                        />
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-xs text-[var(--color-suave)]">
                        {dataBR(linha.data)}
                      </td>
                      <td className="max-w-[14rem] px-2 py-2">
                        <span className="block truncate">{linha.descricao}</span>
                        {linha.duplicada && (
                          <span className="text-[11px] text-[var(--color-ambar)]">
                            já importada
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <select
                          value={linha.categoria_id ?? ""}
                          onChange={(e) => trocarCategoria(indice, e.target.value)}
                          className="w-full max-w-[11rem] rounded-lg border border-[var(--color-borda)] bg-[var(--color-fundo)] px-2 py-1.5 text-xs outline-none focus:border-[var(--color-verde)]"
                        >
                          <option value="">Sem categoria</option>
                          {opcoes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icone} {c.nome}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums ${
                          linha.tipo === "receita"
                            ? "text-[var(--color-verde)]"
                            : "text-[var(--color-texto)]"
                        }`}
                      >
                        {linha.tipo === "receita" ? "+" : "−"}
                        {moeda(linha.valor)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
