/**
 * Extração de texto de PDF.
 *
 * O pdf.js devolve fragmentos soltos com coordenadas, não linhas. Extratos
 * bancários só fazem sentido linha a linha (data, descrição e valor vêm na
 * mesma faixa horizontal), então os fragmentos são reagrupados pela posição
 * vertical antes de qualquer tentativa de interpretação.
 */

type Fragmento = { texto: string; x: number; y: number };

export async function extrairLinhasPDF(dados: Uint8Array): Promise<string[]> {
  // Import dinâmico: o pdf.js é pesado e só é necessário quando entra um PDF.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  const documento = await pdfjs.getDocument({
    data: dados,
    // Sem worker, sem eval e sem buscar fontes pela rede: o código roda numa
    // função serverless, não num navegador.
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: false,
    verbosity: 0,
  }).promise;

  const linhas: string[] = [];

  for (let numero = 1; numero <= documento.numPages; numero++) {
    const pagina = await documento.getPage(numero);
    const conteudo = await pagina.getTextContent();

    const fragmentos: Fragmento[] = [];
    for (const item of conteudo.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      // transform = [a, b, c, d, e, f]; e/f são as coordenadas do fragmento.
      const [, , , , x, y] = item.transform as number[];
      fragmentos.push({ texto: item.str, x, y });
    }

    linhas.push(...agruparEmLinhas(fragmentos));
  }

  await documento.destroy();
  return linhas;
}

/**
 * Junta fragmentos que estão na mesma faixa vertical.
 *
 * A tolerância existe porque a linha de base varia alguns décimos de ponto
 * dentro da mesma linha visual, principalmente quando há fontes diferentes
 * (negrito na descrição, regular no valor).
 */
function agruparEmLinhas(fragmentos: Fragmento[], tolerancia = 2.5): string[] {
  if (fragmentos.length === 0) return [];

  // De cima para baixo: no PDF o eixo Y cresce para cima.
  const ordenados = [...fragmentos].sort((a, b) => b.y - a.y || a.x - b.x);

  const grupos: Fragmento[][] = [];
  let atual: Fragmento[] = [ordenados[0]];
  let referenciaY = ordenados[0].y;

  for (const fragmento of ordenados.slice(1)) {
    if (Math.abs(fragmento.y - referenciaY) <= tolerancia) {
      atual.push(fragmento);
    } else {
      grupos.push(atual);
      atual = [fragmento];
      referenciaY = fragmento.y;
    }
  }
  grupos.push(atual);

  return grupos
    .map((grupo) =>
      grupo
        .sort((a, b) => a.x - b.x)
        .map((f) => f.texto)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((linha) => linha.length > 0);
}
