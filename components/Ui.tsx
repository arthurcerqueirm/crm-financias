import { moeda, percentual } from "@/lib/formato";

export function CartaoKPI({
  rotulo,
  valor,
  variacao: variacaoPct,
  cor = "texto",
  legenda,
}: {
  rotulo: string;
  valor: number;
  variacao?: number | null;
  cor?: "texto" | "verde" | "vermelho" | "azul";
  legenda?: string;
}) {
  const cores = {
    texto: "text-[var(--color-texto)]",
    verde: "text-[var(--color-verde)]",
    vermelho: "text-[var(--color-vermelho)]",
    azul: "text-[var(--color-azul)]",
  };

  return (
    <div className="painel">
      <p className="text-xs font-medium text-[var(--color-suave)]">{rotulo}</p>
      <p
        className={`mt-1.5 text-xl font-bold tabular-nums sm:text-2xl ${cores[cor]}`}
      >
        {moeda(valor)}
      </p>
      {variacaoPct != null && (
        <p className="mt-1 text-xs text-[var(--color-suave)]">
          <span
            className={
              variacaoPct >= 0
                ? "text-[var(--color-verde)]"
                : "text-[var(--color-vermelho)]"
            }
          >
            {percentual(variacaoPct)}
          </span>{" "}
          vs. mês anterior
        </p>
      )}
      {legenda && (
        <p className="mt-1 text-xs text-[var(--color-suave)]">{legenda}</p>
      )}
    </div>
  );
}

export function BarraCategoria({
  nome,
  icone,
  cor,
  total,
  fatia,
  orcamento,
}: {
  nome: string;
  icone: string;
  cor: string;
  total: number;
  fatia: number;
  orcamento?: number | null;
}) {
  const usoOrcamento = orcamento ? (total / orcamento) * 100 : null;
  const estourou = usoOrcamento != null && usoOrcamento > 100;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className="shrink-0">{icone}</span>
          <span className="truncate font-medium">{nome}</span>
        </span>
        <span className="shrink-0 font-semibold tabular-nums">
          {moeda(total)}
        </span>
      </div>

      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--color-fundo)]">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, Math.max(fatia, 1.5))}%`,
            backgroundColor: cor,
          }}
        />
      </div>

      <p className="mt-1 text-[11px] text-[var(--color-suave)]">
        {fatia.toFixed(1).replace(".", ",")}% dos gastos
        {usoOrcamento != null && (
          <span
            className={
              estourou ? " text-[var(--color-vermelho)]" : " text-[var(--color-verde)]"
            }
          >
            {" · "}
            {usoOrcamento.toFixed(0)}% do orçamento de {moeda(orcamento!)}
          </span>
        )}
      </p>
    </div>
  );
}

export function Vazio({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: React.ReactNode;
}) {
  return (
    <div className="painel flex flex-col items-center py-12 text-center">
      <p className="font-semibold">{titulo}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[var(--color-suave)]">
        {descricao}
      </p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
