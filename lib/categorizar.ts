import { normalizar } from "@/lib/extrato";
import type { Categoria } from "@/lib/tipos";

/**
 * Categorização por palavra-chave. Roda antes da IA: o que der match aqui
 * é de graça e instantâneo, e só sobra o resto para o modelo.
 */
export function categorizarPorRegra(
  descricao: string,
  ehReceita: boolean,
  categorias: Categoria[],
): Categoria | null {
  const texto = normalizar(descricao);
  const candidatas = categorias.filter((c) =>
    ehReceita ? c.tipo === "receita" : c.tipo === "despesa",
  );

  let melhor: Categoria | null = null;
  let melhorTamanho = 0;

  for (const categoria of candidatas) {
    for (const palavra of categoria.palavras_chave) {
      const chave = normalizar(palavra);
      if (chave.length < 2 || !texto.includes(chave)) continue;
      // A palavra-chave mais longa ganha: "mercado livre" vence "mercado".
      if (chave.length > melhorTamanho) {
        melhorTamanho = chave.length;
        melhor = categoria;
      }
    }
  }

  return melhor;
}
