import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import { gerarHash, lerExtrato, normalizar } from "@/lib/extrato";
import { categorizarPorRegra } from "@/lib/categorizar";
import { categorizarComIA, temChaveIA, type ItemParaCategorizar } from "@/lib/ia";
import type { Categoria, LinhaExtrato } from "@/lib/tipos";

export const maxDuration = 300;

/** Extratos de banco costumam vir em ISO-8859-1; UTF-8 é o caso feliz. */
function decodificar(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8").decode(buffer);
  // U+FFFD indica bytes que não são UTF-8 válido.
  if (!utf8.includes("�")) return utf8;
  return new TextDecoder("iso-8859-1").decode(buffer);
}

export async function POST(request: Request) {
  if (!supabaseConfigurado()) {
    return NextResponse.json(
      { erro: "O Supabase ainda não foi configurado neste deploy." },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Você precisa estar logado." }, { status: 401 });
  }

  const formData = await request.formData();
  const arquivo = formData.get("arquivo");
  const usarIA = formData.get("usarIA") === "true";

  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return NextResponse.json({ erro: "Envie um arquivo de extrato." }, { status: 400 });
  }
  if (arquivo.size > 6 * 1024 * 1024) {
    return NextResponse.json(
      { erro: "Arquivo muito grande (máximo 6 MB). Tente exportar um período menor." },
      { status: 400 },
    );
  }

  let leitura;
  try {
    leitura = lerExtrato(decodificar(await arquivo.arrayBuffer()), arquivo.name);
  } catch (erro) {
    return NextResponse.json(
      { erro: erro instanceof Error ? erro.message : "Não consegui ler o arquivo." },
      { status: 400 },
    );
  }

  const { data: categoriasBrutas } = await supabase.from("categorias").select("*");
  const categorias = (categoriasBrutas ?? []) as Categoria[];
  const porNome = new Map(categorias.map((c) => [normalizar(c.nome), c]));

  // Hash por linha. O contador separa lançamentos idênticos no mesmo dia.
  const ocorrencias = new Map<string, number>();
  const linhas: LinhaExtrato[] = leitura.linhas.map((linha) => {
    const chave = `${linha.data}|${linha.valor.toFixed(2)}|${normalizar(linha.descricao)}`;
    const indice = ocorrencias.get(chave) ?? 0;
    ocorrencias.set(chave, indice + 1);

    const ehReceita = linha.valor > 0;
    const categoria = categorizarPorRegra(linha.descricao, ehReceita, categorias);

    return {
      data: linha.data,
      descricao: linha.descricao,
      valor: Math.abs(linha.valor),
      tipo: ehReceita ? "receita" : "despesa",
      categoria_id: categoria?.id ?? null,
      categoria_nome: categoria?.nome ?? null,
      categorizado_por: categoria ? "regra" : "manual",
      hash_dedup: gerarHash(linha.data, linha.valor, linha.descricao, indice),
      duplicada: false,
    };
  });

  // Marca o que já foi importado antes.
  const hashes = linhas.map((l) => l.hash_dedup);
  const jaImportados = new Set<string>();
  for (let i = 0; i < hashes.length; i += 300) {
    const { data } = await supabase
      .from("transacoes")
      .select("hash_dedup")
      .in("hash_dedup", hashes.slice(i, i + 300));
    for (const linha of data ?? []) {
      if (linha.hash_dedup) jaImportados.add(linha.hash_dedup);
    }
  }
  for (const linha of linhas) {
    linha.duplicada = jaImportados.has(linha.hash_dedup);
  }

  // A IA cuida só do que as regras não reconheceram e ainda não foi importado.
  let usouIA = false;
  let avisoIA: string | null = null;

  if (usarIA && temChaveIA()) {
    const pendentes: ItemParaCategorizar[] = [];
    linhas.forEach((linha, indice) => {
      if (!linha.categoria_id && !linha.duplicada) {
        pendentes.push({
          indice,
          descricao: linha.descricao,
          valor: linha.valor,
          tipo: linha.tipo === "receita" ? "receita" : "despesa",
        });
      }
    });

    if (pendentes.length > 0) {
      try {
        const sugestoes = await categorizarComIA(
          pendentes,
          categorias.filter((c) => c.tipo === "despesa").map((c) => c.nome),
          categorias.filter((c) => c.tipo === "receita").map((c) => c.nome),
        );

        for (const [indice, sugestao] of sugestoes) {
          const linha = linhas[indice];
          const categoria = porNome.get(normalizar(sugestao.categoria));
          if (!linha || !categoria) continue;
          linha.categoria_id = categoria.id;
          linha.categoria_nome = categoria.nome;
          linha.categorizado_por = "ia";
          if (sugestao.comerciante.trim()) {
            linha.descricao = sugestao.comerciante.trim();
          }
        }
        usouIA = true;
      } catch (erro) {
        // Categorização é um extra: sem IA o usuário ainda importa e ajusta na mão.
        avisoIA =
          erro instanceof Error
            ? `A IA não conseguiu categorizar (${erro.message}). Você pode ajustar manualmente.`
            : "A IA não conseguiu categorizar. Você pode ajustar manualmente.";
      }
    }
  } else if (usarIA && !temChaveIA()) {
    avisoIA =
      "ANTHROPIC_API_KEY não está configurada — a categorização automática ficou só nas regras.";
  }

  return NextResponse.json({
    linhas,
    formato: leitura.formato,
    ignoradas: leitura.ignoradas,
    duplicadas: linhas.filter((l) => l.duplicada).length,
    usouIA,
    avisoIA,
    arquivo: arquivo.name,
  });
}
