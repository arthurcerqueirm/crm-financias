import { test } from "node:test";
import assert from "node:assert/strict";
import {
  serieMensal,
  porCategoria,
  evolucaoPatrimonio,
  detectarRecorrentes,
  variacao,
  mesDa,
} from "@/lib/agregacoes";
import type { RegistroPatrimonio, TransacaoComCategoria } from "@/lib/tipos";

function transacao(parcial: Partial<TransacaoComCategoria>): TransacaoComCategoria {
  return {
    id: "t1",
    user_id: "u1",
    conta_id: null,
    categoria_id: null,
    importacao_id: null,
    conta_destino_id: null,
    data: "2026-03-01",
    descricao: "Teste",
    descricao_original: null,
    valor: 100,
    tipo: "despesa",
    observacao: null,
    origem: "manual",
    categorizado_por: "manual",
    hash_dedup: null,
    created_at: "2026-03-01T00:00:00Z",
    categorias: null,
    contas: null,
    contas_destino: null,
    ...parcial,
  };
}

test("mesDa - extrai AAAA-MM de uma data ISO", () => {
  assert.equal(mesDa("2026-03-15"), "2026-03");
});

test("serieMensal - soma por tipo e ignora transferência", () => {
  const transacoes = [
    transacao({ data: "2026-03-05", tipo: "receita", valor: 5000 }),
    transacao({ data: "2026-03-10", tipo: "despesa", valor: 1200 }),
    transacao({ data: "2026-03-12", tipo: "transferencia", valor: 300 }),
    transacao({ data: "2026-02-01", tipo: "despesa", valor: 800 }),
  ];

  const serie = serieMensal(transacoes, 3, "2026-03");
  assert.deepEqual(
    serie.map((s) => s.mes),
    ["2026-01", "2026-02", "2026-03"],
  );

  const marco = serie.find((s) => s.mes === "2026-03")!;
  assert.equal(marco.receitas, 5000);
  assert.equal(marco.despesas, 1200); // transferência não entra
  assert.equal(marco.saldo, 3800);

  const janeiro = serie.find((s) => s.mes === "2026-01")!;
  assert.deepEqual(janeiro, { mes: "2026-01", receitas: 0, despesas: 0, saldo: 0 });
});

test("porCategoria - agrupa, ordena da maior para a menor e calcula a fatia", () => {
  const categoriaMercado = { id: "c1", nome: "Mercado", cor: "#f00", icone: "🛒" };
  const categoriaLazer = { id: "c2", nome: "Lazer", cor: "#0f0", icone: "🎬" };

  const transacoes = [
    transacao({ valor: 300, categoria_id: "c1", categorias: categoriaMercado }),
    transacao({ valor: 100, categoria_id: "c1", categorias: categoriaMercado }),
    transacao({ valor: 100, categoria_id: "c2", categorias: categoriaLazer }),
    transacao({ valor: 50, categoria_id: null, categorias: null }),
  ];

  const resultado = porCategoria(transacoes, "despesa");
  assert.equal(resultado.length, 3);
  assert.equal(resultado[0].nome, "Mercado");
  assert.equal(resultado[0].total, 400);
  assert.equal(resultado[0].transacoes, 2);
  assert.equal(resultado[0].fatia, (400 / 550) * 100);
  assert.equal(resultado.at(-1)!.nome, "Sem categoria");
});

test("evolucaoPatrimonio - usa o registro mais recente de cada ativo até o mês de referência", () => {
  const registros: RegistroPatrimonio[] = [
    { id: "1", user_id: "u1", conta_id: null, nome: "Nubank", tipo: "ativo", data: "2026-01-01", valor: 1000, created_at: "" },
    { id: "2", user_id: "u1", conta_id: null, nome: "Nubank", tipo: "ativo", data: "2026-03-01", valor: 1500, created_at: "" },
    { id: "3", user_id: "u1", conta_id: null, nome: "Financiamento", tipo: "passivo", data: "2026-02-01", valor: 200, created_at: "" },
  ];

  const evolucao = evolucaoPatrimonio(registros, 4, "2026-03");
  assert.deepEqual(
    evolucao.map((e) => e.mes),
    ["2025-12", "2026-01", "2026-02", "2026-03"],
  );

  // Dezembro: nada registrado ainda.
  assert.deepEqual(evolucao[0], { mes: "2025-12", ativos: 0, passivos: 0, liquido: 0 });
  // Janeiro: só o Nubank de 1000.
  assert.equal(evolucao[1].ativos, 1000);
  // Fevereiro: Nubank continua em 1000 (não foi atualizado), dívida entra.
  assert.equal(evolucao[2].ativos, 1000);
  assert.equal(evolucao[2].passivos, 200);
  // Março: Nubank atualizado para 1500.
  assert.equal(evolucao[3].ativos, 1500);
  assert.equal(evolucao[3].liquido, 1500 - 200);
});

test("evolucaoPatrimonio - respeita o mês de referência passado (item 4 da auditoria)", () => {
  const registros: RegistroPatrimonio[] = [
    { id: "1", user_id: "u1", conta_id: null, nome: "Conta", tipo: "ativo", data: "2026-06-01", valor: 999, created_at: "" },
  ];
  // Pedindo até janeiro, um registro de junho não pode aparecer.
  const evolucao = evolucaoPatrimonio(registros, 2, "2026-01");
  assert.ok(evolucao.every((e) => e.ativos === 0));
});

test("detectarRecorrentes - só entra quem se repete em pelo menos dois meses", () => {
  const transacoes = [
    transacao({ data: "2026-01-05", descricao: "Netflix", valor: 39.9 }),
    transacao({ data: "2026-02-05", descricao: "Netflix", valor: 39.9 }),
    transacao({ data: "2026-03-05", descricao: "Netflix", valor: 39.9 }),
    transacao({ data: "2026-01-10", descricao: "Compra única", valor: 500 }),
  ];

  const recorrentes = detectarRecorrentes(transacoes);
  assert.equal(recorrentes.length, 1);
  assert.equal(recorrentes[0].descricao, "Netflix");
  assert.equal(recorrentes[0].ocorrencias, 3);
});

test("variacao - percentual entre dois períodos, null quando o anterior é zero", () => {
  assert.equal(variacao(150, 100), 50);
  assert.equal(variacao(50, 100), -50);
  assert.equal(variacao(100, 0), null);
});
