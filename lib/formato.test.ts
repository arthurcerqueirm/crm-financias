import { test } from "node:test";
import assert from "node:assert/strict";
import {
  lerValor,
  lerValorPositivo,
  escaparLike,
  moeda,
  percentual,
  dataBR,
  mesCurto,
  mesLongo,
  limitesDoMes,
  ultimosMeses,
  mesAnterior,
} from "@/lib/formato";

test("lerValor - ponto como decimal (o bug crítico de valor)", () => {
  // Antes da correção, os formulários interpretavam ponto como separador
  // de milhar sempre — "89.90" digitado virava R$ 8.990,00 sem aviso.
  assert.equal(lerValor("1500.50"), 1500.5);
  assert.equal(lerValor("89.90"), 89.9);
  assert.equal(lerValor("12.5"), 12.5);
});

test("lerValor - formatos brasileiros", () => {
  assert.equal(lerValor("149,90"), 149.9);
  assert.equal(lerValor("1.234,56"), 1234.56);
  assert.equal(lerValor("1500"), 1500);
});

test("lerValor - formato americano e símbolo de moeda", () => {
  assert.equal(lerValor("-1,234.56"), -1234.56);
  assert.equal(lerValor("R$ 45,90"), 45.9);
});

test("lerValor - parênteses contábeis são negativos", () => {
  assert.equal(lerValor("(150,00)"), -150);
});

test("lerValor - entradas inválidas devolvem null", () => {
  assert.equal(lerValor(""), null);
  assert.equal(lerValor("abc"), null);
  assert.equal(lerValor("   "), null);
});

test("lerValorPositivo - rejeita zero, negativo e valor inválido", () => {
  assert.equal(lerValorPositivo("0"), null);
  assert.equal(lerValorPositivo("0,00"), null);
  assert.equal(lerValorPositivo("-50,00"), 50); // usa o valor absoluto
  assert.equal(lerValorPositivo("abc"), null);
  assert.equal(lerValorPositivo("149,90"), 149.9);
});

test("escaparLike - protege % e _ de virarem coringa na busca", () => {
  assert.equal(escaparLike("50%"), "50\\%");
  assert.equal(escaparLike("a_b"), "a\\_b");
  assert.equal(escaparLike("ifood"), "ifood");
});

test("moeda - formata em reais", () => {
  assert.equal(moeda(1234.5), "R$ 1.234,50");
  assert.equal(moeda(-89.9), "-R$ 89,90");
});

test("moeda - forma compacta para valores grandes", () => {
  assert.equal(moeda(1500, true), "R$ 1,5k");
  assert.equal(moeda(2_500_000, true), "R$ 2,5M");
});

test("percentual - sinal explícito", () => {
  assert.equal(percentual(12.34), "+12,3%");
  assert.equal(percentual(-5), "-5,0%");
});

test("dataBR - converte sem passar por Date (evita bug de fuso)", () => {
  assert.equal(dataBR("2026-03-05"), "05/03/2026");
});

test("mesCurto e mesLongo", () => {
  assert.equal(mesCurto("2026-03"), "Mar/26");
  assert.equal(mesLongo("2026-03"), "Março de 2026");
});

test("limitesDoMes - cobre fevereiro bissexto", () => {
  assert.deepEqual(limitesDoMes("2028-02"), {
    inicio: "2028-02-01",
    fim: "2028-02-29",
  });
  assert.deepEqual(limitesDoMes("2026-02"), {
    inicio: "2026-02-01",
    fim: "2026-02-28",
  });
});

test("ultimosMeses - inclui o mês de referência e vira o ano", () => {
  assert.deepEqual(ultimosMeses(3, "2026-01"), [
    "2025-11",
    "2025-12",
    "2026-01",
  ]);
});

test("mesAnterior - vira o ano em janeiro", () => {
  assert.equal(mesAnterior("2026-01"), "2025-12");
  assert.equal(mesAnterior("2026-06"), "2026-05");
});
