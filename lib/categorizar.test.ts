import { test } from "node:test";
import assert from "node:assert/strict";
import { categorizarPorRegra } from "@/lib/categorizar";
import type { Categoria } from "@/lib/tipos";

function categoria(parcial: Partial<Categoria>): Categoria {
  return {
    id: "id",
    user_id: "u1",
    nome: "Categoria",
    tipo: "despesa",
    cor: "#000",
    icone: "📦",
    palavras_chave: [],
    orcamento_mensal: null,
    created_at: "",
    ...parcial,
  };
}

test("categorizarPorRegra - encontra pela palavra-chave, ignorando acento e caixa", () => {
  const categorias = [
    categoria({ id: "c1", nome: "Alimentação", palavras_chave: ["ifood", "restaurante"] }),
  ];
  const achada = categorizarPorRegra("PAG*IFOOD SAO PAULO", false, categorias);
  assert.equal(achada?.id, "c1");
});

test("categorizarPorRegra - palavra-chave mais longa vence (mercado livre x mercado)", () => {
  const categorias = [
    categoria({ id: "mercado", nome: "Mercado", palavras_chave: ["mercado"] }),
    categoria({ id: "compras", nome: "Compras", palavras_chave: ["mercado livre"] }),
  ];
  const achada = categorizarPorRegra("Compra Mercado Livre", false, categorias);
  assert.equal(achada?.id, "compras");
});

test("categorizarPorRegra - respeita o tipo (não cruza despesa com receita)", () => {
  const categorias = [
    categoria({ id: "salario", nome: "Salário", tipo: "receita", palavras_chave: ["pagamento"] }),
  ];
  // Mesma palavra, mas é uma despesa — não deve casar com a categoria de receita.
  const achada = categorizarPorRegra("Pagamento boleto", false, categorias);
  assert.equal(achada, null);
});

test("categorizarPorRegra - sem nenhuma palavra-chave batendo devolve null", () => {
  const categorias = [categoria({ palavras_chave: ["algo"] })];
  assert.equal(categorizarPorRegra("Descrição qualquer", false, categorias), null);
});
