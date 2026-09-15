"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { moeda, mesCurto } from "@/lib/formato";
import { useTemaEscuro } from "@/lib/useTemaEscuro";
import type { ResumoMes, FatiaCategoria } from "@/lib/agregacoes";

// Os componentes de gráfico pintam cor via atributos SVG (fill/stroke), que
// não leem as variáveis CSS do tema sozinhos — diferente do resto do app,
// que usa classes como text-[var(--color-verde)] e resolve isso pela
// cascata. Por isso existe uma paleta espelhada em JS, escolhida por
// useTemaEscuro(); os hexadecimais aqui têm que continuar batendo com os de
// globals.css se um dia mudarem lá.
const PALETA = {
  escuro: {
    verde: "#2ecc8f",
    vermelho: "#ff5c72",
    azul: "#4a9eff",
    suave: "#8ba0b6",
    grade: "#22303f",
  },
  claro: {
    verde: "#047857",
    vermelho: "#dc2626",
    azul: "#2563eb",
    suave: "#5b6472",
    grade: "#d7dee6",
  },
};

function useCores() {
  const escuro = useTemaEscuro();
  return escuro ? PALETA.escuro : PALETA.claro;
}

function Caixa({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { nome: string; valor: number; cor: string }[];
}) {
  return (
    <div className="rounded-xl border border-[var(--color-borda)] bg-[var(--color-painel-alto)] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs font-semibold text-[var(--color-texto)]">
        {titulo}
      </p>
      {itens.map((item) => (
        <p key={item.nome} className="text-xs text-[var(--color-suave)]">
          <span
            className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle"
            style={{ backgroundColor: item.cor }}
          />
          {item.nome}:{" "}
          <span className="font-medium text-[var(--color-texto)]">
            {moeda(item.valor)}
          </span>
        </p>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// Receitas x Despesas por mês
// ------------------------------------------------------------------

export function GraficoReceitaDespesa({ dados }: { dados: ResumoMes[] }) {
  const cores = useCores();
  const eixo = { stroke: cores.suave, fontSize: 11, tickLine: false, axisLine: false };
  const grade = { stroke: cores.grade, strokeDasharray: "3 3" };

  return (
    <div
      role="img"
      aria-label={`Gráfico de barras comparando receitas e despesas dos últimos ${dados.length} meses.`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <CartesianGrid {...grade} vertical={false} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} {...eixo} />
          <YAxis tickFormatter={(v: number) => moeda(v, true)} {...eixo} width={62} />
          <Tooltip
            cursor={{ fill: "#88888812" }}
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={mesCurto(String(label))}
                  itens={[
                    { nome: "Receitas", valor: Number(payload[0]?.value ?? 0), cor: cores.verde },
                    { nome: "Despesas", valor: Number(payload[1]?.value ?? 0), cor: cores.vermelho },
                  ]}
                />
              ) : null
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: cores.suave, paddingTop: 8 }}
            formatter={(v) => (
              <span className="text-[var(--color-suave)]">{v}</span>
            )}
          />
          <Bar dataKey="receitas" name="Receitas" fill={cores.verde} radius={[5, 5, 0, 0]} maxBarSize={38} />
          <Bar dataKey="despesas" name="Despesas" fill={cores.vermelho} radius={[5, 5, 0, 0]} maxBarSize={38} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------------
// Gastos por categoria (rosca)
// ------------------------------------------------------------------

export function GraficoCategorias({ dados }: { dados: FatiaCategoria[] }) {
  if (dados.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-suave)]">
        Sem despesas no período.
      </p>
    );
  }

  return (
    <div
      role="img"
      aria-label={`Gráfico de rosca com ${dados.length} categorias de gasto. Maior: ${dados[0].nome}, ${dados[0].fatia.toFixed(0)}% do total.`}
    >
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie
            data={dados}
            dataKey="total"
            nameKey="nome"
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={98}
            paddingAngle={2}
            stroke="none"
          >
            {dados.map((fatia) => (
              <Cell key={fatia.id} fill={fatia.cor} />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const fatia = payload[0].payload as FatiaCategoria;
              return (
                <Caixa
                  titulo={`${fatia.icone} ${fatia.nome}`}
                  itens={[
                    { nome: `${fatia.fatia.toFixed(1)}% do total`, valor: fatia.total, cor: fatia.cor },
                  ]}
                />
              );
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda própria em vez da do Recharts: em lista, com nome e valor
          sempre visíveis — não depende só da cor da fatia para diferenciar
          categorias, e não fica ilegível com 12+ categorias apertadas embaixo
          do gráfico. */}
      <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {dados.slice(0, 8).map((fatia) => (
          <li key={fatia.id} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: fatia.cor }}
            />
            <span className="text-[var(--color-suave)]">
              {fatia.icone} {fatia.nome}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------------
// Evolução do patrimônio
// ------------------------------------------------------------------

export function GraficoPatrimonio({
  dados,
}: {
  dados: { mes: string; ativos: number; passivos: number; liquido: number }[];
}) {
  const cores = useCores();
  const eixo = { stroke: cores.suave, fontSize: 11, tickLine: false, axisLine: false };
  const grade = { stroke: cores.grade, strokeDasharray: "3 3" };
  const ultimo = dados.at(-1);

  return (
    <div
      role="img"
      aria-label={`Gráfico de área com a evolução do patrimônio líquido nos últimos ${dados.length} meses${ultimo ? `, hoje em ${moeda(ultimo.liquido)}` : ""}.`}
    >
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cores.verde} stopOpacity={0.45} />
              <stop offset="100%" stopColor={cores.verde} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grade} vertical={false} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} {...eixo} />
          <YAxis tickFormatter={(v: number) => moeda(v, true)} {...eixo} width={62} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={mesCurto(String(label))}
                  itens={[
                    { nome: "Patrimônio líquido", valor: Number(payload[0]?.payload.liquido ?? 0), cor: cores.verde },
                    { nome: "Ativos", valor: Number(payload[0]?.payload.ativos ?? 0), cor: cores.azul },
                    { nome: "Dívidas", valor: Number(payload[0]?.payload.passivos ?? 0), cor: cores.vermelho },
                  ]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="liquido"
            stroke={cores.verde}
            strokeWidth={2.5}
            fill="url(#gradPatrimonio)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------------
// Evolução de uma categoria ao longo dos meses
// ------------------------------------------------------------------

export function GraficoTendencia({
  dados,
  cor,
  rotulo,
}: {
  dados: { mes: string; valor: number }[];
  /** Cor própria (ex.: a cor escolhida pra categoria). Sem isto, usa o azul do tema. */
  cor?: string;
  rotulo: string;
}) {
  const cores = useCores();
  const eixo = { stroke: cores.suave, fontSize: 11, tickLine: false, axisLine: false };
  const grade = { stroke: cores.grade, strokeDasharray: "3 3" };
  const corResolvida = cor ?? cores.azul;

  return (
    <div role="img" aria-label={`Gráfico de linha: ${rotulo} nos últimos ${dados.length} meses.`}>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <CartesianGrid {...grade} vertical={false} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} {...eixo} />
          <YAxis tickFormatter={(v: number) => moeda(v, true)} {...eixo} width={62} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={mesCurto(String(label))}
                  itens={[{ nome: rotulo, valor: Number(payload[0]?.value ?? 0), cor: corResolvida }]}
                />
              ) : null
            }
          />
          <Line
            type="monotone"
            dataKey="valor"
            stroke={corResolvida}
            strokeWidth={2.5}
            dot={{ r: 3, fill: corResolvida, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ------------------------------------------------------------------
// Saldo acumulado no mês
// ------------------------------------------------------------------

export function GraficoSaldoMensal({ dados }: { dados: ResumoMes[] }) {
  const cores = useCores();
  const eixo = { stroke: cores.suave, fontSize: 11, tickLine: false, axisLine: false };
  const grade = { stroke: cores.grade, strokeDasharray: "3 3" };

  return (
    <div role="img" aria-label={`Gráfico de área: quanto sobrou por mês nos últimos ${dados.length} meses.`}>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cores.azul} stopOpacity={0.4} />
              <stop offset="100%" stopColor={cores.azul} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid {...grade} vertical={false} />
          <XAxis dataKey="mes" tickFormatter={mesCurto} {...eixo} />
          <YAxis tickFormatter={(v: number) => moeda(v, true)} {...eixo} width={62} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <Caixa
                  titulo={mesCurto(String(label))}
                  itens={[{ nome: "Sobrou no mês", valor: Number(payload[0]?.value ?? 0), cor: cores.azul }]}
                />
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="saldo"
            stroke={cores.azul}
            strokeWidth={2.5}
            fill="url(#gradSaldo)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
