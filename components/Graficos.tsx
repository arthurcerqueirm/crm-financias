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
import type { ResumoMes, FatiaCategoria } from "@/lib/agregacoes";

const EIXO = {
  stroke: "#8ba0b6",
  fontSize: 11,
  tickLine: false,
  axisLine: false,
};

const GRADE = { stroke: "#22303f", strokeDasharray: "3 3" };

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
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="mes" tickFormatter={mesCurto} {...EIXO} />
        <YAxis tickFormatter={(v: number) => moeda(v, true)} {...EIXO} width={62} />
        <Tooltip
          cursor={{ fill: "#ffffff08" }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Caixa
                titulo={mesCurto(String(label))}
                itens={[
                  { nome: "Receitas", valor: Number(payload[0]?.value ?? 0), cor: "#2ecc8f" },
                  { nome: "Despesas", valor: Number(payload[1]?.value ?? 0), cor: "#ff5c72" },
                ]}
              />
            ) : null
          }
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: "#8ba0b6", paddingTop: 8 }}
          formatter={(v) => (
            <span className="text-[var(--color-suave)]">{v}</span>
          )}
        />
        <Bar dataKey="receitas" name="Receitas" fill="#2ecc8f" radius={[5, 5, 0, 0]} maxBarSize={38} />
        <Bar dataKey="despesas" name="Despesas" fill="#ff5c72" radius={[5, 5, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
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
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradPatrimonio" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ecc8f" stopOpacity={0.45} />
            <stop offset="100%" stopColor="#2ecc8f" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="mes" tickFormatter={mesCurto} {...EIXO} />
        <YAxis tickFormatter={(v: number) => moeda(v, true)} {...EIXO} width={62} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Caixa
                titulo={mesCurto(String(label))}
                itens={[
                  { nome: "Patrimônio líquido", valor: Number(payload[0]?.payload.liquido ?? 0), cor: "#2ecc8f" },
                  { nome: "Ativos", valor: Number(payload[0]?.payload.ativos ?? 0), cor: "#4a9eff" },
                  { nome: "Dívidas", valor: Number(payload[0]?.payload.passivos ?? 0), cor: "#ff5c72" },
                ]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="liquido"
          stroke="#2ecc8f"
          strokeWidth={2.5}
          fill="url(#gradPatrimonio)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------
// Evolução de uma categoria ao longo dos meses
// ------------------------------------------------------------------

export function GraficoTendencia({
  dados,
  cor = "#4a9eff",
  rotulo,
}: {
  dados: { mes: string; valor: number }[];
  cor?: string;
  rotulo: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="mes" tickFormatter={mesCurto} {...EIXO} />
        <YAxis tickFormatter={(v: number) => moeda(v, true)} {...EIXO} width={62} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Caixa
                titulo={mesCurto(String(label))}
                itens={[{ nome: rotulo, valor: Number(payload[0]?.value ?? 0), cor }]}
              />
            ) : null
          }
        />
        <Line
          type="monotone"
          dataKey="valor"
          stroke={cor}
          strokeWidth={2.5}
          dot={{ r: 3, fill: cor, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ------------------------------------------------------------------
// Saldo acumulado no mês
// ------------------------------------------------------------------

export function GraficoSaldoMensal({ dados }: { dados: ResumoMes[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={dados} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a9eff" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#4a9eff" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid {...GRADE} vertical={false} />
        <XAxis dataKey="mes" tickFormatter={mesCurto} {...EIXO} />
        <YAxis tickFormatter={(v: number) => moeda(v, true)} {...EIXO} width={62} />
        <Tooltip
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <Caixa
                titulo={mesCurto(String(label))}
                itens={[{ nome: "Sobrou no mês", valor: Number(payload[0]?.value ?? 0), cor: "#4a9eff" }]}
              />
            ) : null
          }
        />
        <Area
          type="monotone"
          dataKey="saldo"
          stroke="#4a9eff"
          strokeWidth={2.5}
          fill="url(#gradSaldo)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
