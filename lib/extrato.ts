/**
 * Leitura de extratos bancários.
 *
 * Suporta CSV (a maioria dos bancos brasileiros — Nubank, Itaú, Bradesco, BB,
 * Inter, C6, Santander) e OFX. O formato varia muito entre bancos, então a
 * detecção de separador, cabeçalho e colunas é toda por heurística.
 */

export type LinhaBruta = {
  data: string; // ISO: 2026-03-15
  descricao: string;
  valor: number; // negativo = saída, positivo = entrada
};

export type ResultadoLeitura = {
  linhas: LinhaBruta[];
  ignoradas: number;
  formato: "csv" | "ofx" | "pdf";
};

// ------------------------------------------------------------------
// Normalização
// ------------------------------------------------------------------

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function normalizar(texto: string): string {
  return semAcento(texto).toLowerCase().replace(/\s+/g, " ").trim();
}

// lerValor mora em lib/formato.ts — é a mesma lógica de desambiguação
// usada nos formulários da interface, e um lançamento de extrato não deixa
// de ser um valor em reais só porque veio de um arquivo.
export { lerValor } from "@/lib/formato";
import { lerValor } from "@/lib/formato";

/** Converte data em ISO. Aceita DD/MM/AAAA, DD-MM-AA, AAAA-MM-DD, AAAAMMDD. */
export function lerData(bruto: string): string | null {
  if (!bruto) return null;
  const texto = bruto.trim().slice(0, 30);

  // AAAA-MM-DD ou AAAA/MM/DD
  let m = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return montarISO(m[1], m[2], m[3]);

  // DD/MM/AAAA, DD-MM-AA, DD.MM.AAAA
  m = texto.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    let ano = m[3];
    if (ano.length === 2) ano = Number(ano) > 70 ? `19${ano}` : `20${ano}`;
    return montarISO(ano, m[2], m[1]);
  }

  // AAAAMMDD (padrão OFX)
  m = texto.match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return montarISO(m[1], m[2], m[3]);

  return null;
}

function montarISO(ano: string, mes: string, dia: string): string | null {
  const a = Number(ano);
  const m = Number(mes);
  const d = Number(dia);
  if (a < 1900 || a > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// ------------------------------------------------------------------
// CSV
// ------------------------------------------------------------------

function detectarSeparador(linhas: string[]): string {
  const candidatos = [";", ",", "\t", "|"];
  let melhor = ",";
  let melhorNota = -1;

  for (const sep of candidatos) {
    const contagens = linhas
      .slice(0, 15)
      .map((l) => dividirLinha(l, sep).length)
      .filter((n) => n > 1);
    if (contagens.length < 2) continue;

    // Um bom separador gera o mesmo número de colunas em quase toda linha.
    const moda = contagens.sort(
      (a, b) =>
        contagens.filter((c) => c === b).length -
        contagens.filter((c) => c === a).length,
    )[0];
    const consistencia = contagens.filter((c) => c === moda).length;
    const nota = consistencia * 10 + moda;
    if (nota > melhorNota) {
      melhorNota = nota;
      melhor = sep;
    }
  }
  return melhor;
}

/** Divide respeitando aspas duplas ("" é aspas escapada). */
function dividirLinha(linha: string, sep: string): string[] {
  const campos: string[] = [];
  let atual = "";
  let dentroAspas = false;

  for (let i = 0; i < linha.length; i++) {
    const c = linha[i];
    if (c === '"') {
      if (dentroAspas && linha[i + 1] === '"') {
        atual += '"';
        i++;
      } else {
        dentroAspas = !dentroAspas;
      }
    } else if (c === sep && !dentroAspas) {
      campos.push(atual);
      atual = "";
    } else {
      atual += c;
    }
  }
  campos.push(atual);
  return campos.map((c) => c.trim().replace(/^"|"$/g, ""));
}

type Colunas = {
  data: number;
  descricao: number;
  valor: number;
  entrada: number;
  saida: number;
  tipo: number;
};

const APELIDOS = {
  data: ["data", "data lancamento", "data da compra", "data mov", "dt", "date", "data movimentacao", "data de lancamento", "data transacao"],
  descricao: ["descricao", "historico", "lancamento", "detalhes", "titulo", "estabelecimento", "memo", "description", "movimentacao", "nome", "observacao"],
  valor: ["valor", "valor r$", "montante", "amount", "valor da compra", "quantia", "value", "vlr"],
  entrada: ["entrada", "credito", "receita", "recebimento", "deposito", "entradas"],
  saida: ["saida", "debito", "despesa", "pagamento", "saidas", "retirada"],
  tipo: ["tipo", "tipo de lancamento", "tipo lancamento", "d/c", "debito/credito", "natureza"],
};

function acharColunas(cabecalho: string[]): Colunas | null {
  const normalizado = cabecalho.map(normalizar);
  const achar = (opcoes: string[]): number => {
    // Primeiro tenta igualdade exata, depois "contém" — evita que
    // "data" case com "data de vencimento" quando existe uma coluna "data".
    for (const opcao of opcoes) {
      const i = normalizado.indexOf(opcao);
      if (i > -1) return i;
    }
    for (const opcao of opcoes) {
      const i = normalizado.findIndex((c) => c.includes(opcao));
      if (i > -1) return i;
    }
    return -1;
  };

  const colunas: Colunas = {
    data: achar(APELIDOS.data),
    descricao: achar(APELIDOS.descricao),
    valor: achar(APELIDOS.valor),
    entrada: achar(APELIDOS.entrada),
    saida: achar(APELIDOS.saida),
    tipo: achar(APELIDOS.tipo),
  };

  const temValor = colunas.valor > -1 || (colunas.entrada > -1 && colunas.saida > -1);
  if (colunas.data < 0 || colunas.descricao < 0 || !temValor) return null;
  return colunas;
}

/** Deduz as colunas pelo conteúdo, para extratos sem cabeçalho reconhecível. */
function deduzirColunas(amostra: string[][]): Colunas | null {
  if (amostra.length === 0) return null;
  const totalCols = Math.max(...amostra.map((l) => l.length));

  let colData = -1;
  let colValor = -1;
  let colDescricao = -1;
  let melhorTextoMedio = -1;

  for (let c = 0; c < totalCols; c++) {
    const celulas = amostra.map((l) => l[c] ?? "").filter(Boolean);
    if (celulas.length === 0) continue;

    const datas = celulas.filter((v) => lerData(v) !== null).length;
    const numeros = celulas.filter((v) => lerValor(v) !== null).length;

    if (colData < 0 && datas / celulas.length > 0.8) {
      colData = c;
      continue;
    }
    if (numeros / celulas.length > 0.8) {
      // Prefere a última coluna numérica (normalmente é o valor, não o saldo...
      // mas a primeira costuma ser o valor quando há saldo depois).
      if (colValor < 0) colValor = c;
      continue;
    }
    const textoMedio =
      celulas.reduce((s, v) => s + v.length, 0) / celulas.length;
    if (textoMedio > melhorTextoMedio) {
      melhorTextoMedio = textoMedio;
      colDescricao = c;
    }
  }

  if (colData < 0 || colValor < 0 || colDescricao < 0) return null;
  return {
    data: colData,
    descricao: colDescricao,
    valor: colValor,
    entrada: -1,
    saida: -1,
    tipo: -1,
  };
}

function lerCSV(conteudo: string): ResultadoLeitura {
  const linhas = conteudo
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !/^[;,\t|\s]*$/.test(l));

  if (linhas.length === 0) {
    throw new Error("O arquivo está vazio.");
  }

  const separador = detectarSeparador(linhas);
  const tabela = linhas.map((l) => dividirLinha(l, separador));

  // Procura o cabeçalho nas primeiras linhas — muitos bancos põem
  // nome do titular, agência e período antes da tabela de verdade.
  let colunas: Colunas | null = null;
  let primeiraLinhaDados = 0;

  for (let i = 0; i < Math.min(15, tabela.length); i++) {
    const encontrado = acharColunas(tabela[i]);
    if (encontrado) {
      colunas = encontrado;
      primeiraLinhaDados = i + 1;
      break;
    }
  }

  if (!colunas) {
    // Sem cabeçalho: tenta deduzir pelo conteúdo das linhas.
    const amostra = tabela.slice(0, 30).filter((l) => l.length > 2);
    colunas = deduzirColunas(amostra);
    primeiraLinhaDados = 0;
    if (!colunas) {
      throw new Error(
        "Não consegui identificar as colunas de data, descrição e valor. " +
          "Verifique se o arquivo tem um cabeçalho com esses nomes.",
      );
    }
  }

  const resultado: LinhaBruta[] = [];
  let ignoradas = 0;

  for (let i = primeiraLinhaDados; i < tabela.length; i++) {
    const campos = tabela[i];
    const data = lerData(campos[colunas.data] ?? "");
    if (!data) {
      ignoradas++;
      continue;
    }

    let valor: number | null = null;
    if (colunas.valor > -1) {
      valor = lerValor(campos[colunas.valor] ?? "");
    }
    if (valor === null && colunas.entrada > -1 && colunas.saida > -1) {
      const entrada = lerValor(campos[colunas.entrada] ?? "") ?? 0;
      const saida = lerValor(campos[colunas.saida] ?? "") ?? 0;
      valor = Math.abs(entrada) - Math.abs(saida);
    }
    if (valor === null || valor === 0) {
      ignoradas++;
      continue;
    }

    // Coluna de tipo separada (D/C) manda no sinal.
    if (colunas.tipo > -1) {
      const marca = normalizar(campos[colunas.tipo] ?? "");
      if (/^(d|debito|saida|despesa|pagamento)/.test(marca)) {
        valor = -Math.abs(valor);
      } else if (/^(c|credito|entrada|receita|recebimento)/.test(marca)) {
        valor = Math.abs(valor);
      }
    }

    const descricao = (campos[colunas.descricao] ?? "").trim() || "Sem descrição";

    resultado.push({ data, descricao, valor });
  }

  if (resultado.length === 0) {
    throw new Error(
      "Nenhuma transação encontrada. Confira se o arquivo é mesmo um extrato.",
    );
  }

  return { linhas: resultado, ignoradas, formato: "csv" };
}

// ------------------------------------------------------------------
// OFX
// ------------------------------------------------------------------

function lerOFX(conteudo: string): ResultadoLeitura {
  const blocos = conteudo.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];
  const linhas: LinhaBruta[] = [];
  let ignoradas = 0;

  const campo = (bloco: string, tag: string): string => {
    // OFX SGML costuma não fechar as tags: <MEMO>Padaria\n
    const re = new RegExp(`<${tag}>([^<\\r\\n]*)`, "i");
    return bloco.match(re)?.[1]?.trim() ?? "";
  };

  for (const bloco of blocos) {
    const data = lerData(campo(bloco, "DTPOSTED"));
    const valor = lerValor(campo(bloco, "TRNAMT"));
    if (!data || valor === null || valor === 0) {
      ignoradas++;
      continue;
    }
    const descricao =
      campo(bloco, "MEMO") || campo(bloco, "NAME") || "Sem descrição";
    linhas.push({ data, descricao, valor });
  }

  if (linhas.length === 0) {
    throw new Error("Nenhuma transação encontrada no arquivo OFX.");
  }

  return { linhas, ignoradas, formato: "ofx" };
}

// ------------------------------------------------------------------
// Entrada principal
// ------------------------------------------------------------------

export function lerExtrato(conteudo: string, nomeArquivo: string): ResultadoLeitura {
  const ehOFX =
    /\.ofx$/i.test(nomeArquivo) ||
    /<OFX>/i.test(conteudo) ||
    /<STMTTRN>/i.test(conteudo);

  return ehOFX ? lerOFX(conteudo) : lerCSV(conteudo);
}

/**
 * Identificador estável da linha, para não importar a mesma transação duas vezes.
 * `ocorrencia` distingue lançamentos idênticos no mesmo dia (dois cafés iguais).
 */
export function gerarHash(
  data: string,
  valor: number,
  descricao: string,
  ocorrencia: number,
): string {
  const base = `${data}|${valor.toFixed(2)}|${normalizar(descricao)}|${ocorrencia}`;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < base.length; i++) {
    const c = base.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

// ------------------------------------------------------------------
// PDF
// ------------------------------------------------------------------

/** Linhas que são cabeçalho, rodapé ou saldo — nunca lançamentos. */
const LINHAS_IGNORADAS =
  /saldo (anterior|do dia|final|em conta|disponivel|atual)|^s *a *l *d *o|total (geral|do periodo)|extrato (de )?conta|lancamentos futuros|pagina \d|^periodo|^agencia|^conta\b|^cliente|^nome|^cpf|^data\b.*(lancamento|historico|descricao)/i;

const MOEDA = /-?\(?\s*R?\$?\s*\d{1,3}(?:\.\d{3})*,\d{2}\s*\)?-?/g;

/**
 * Descobre o ano do extrato. Muitos bancos — o Itaú entre eles — imprimem
 * só dia e mês nos lançamentos, e o ano aparece uma única vez no cabeçalho.
 */
function descobrirAno(linhas: string[]): number {
  const contagem = new Map<number, number>();

  for (const linha of linhas) {
    for (const achado of linha.matchAll(/\b\d{1,2}[/-]\d{1,2}[/-](\d{4})\b/g)) {
      const ano = Number(achado[1]);
      if (ano >= 1990 && ano <= 2200) {
        contagem.set(ano, (contagem.get(ano) ?? 0) + 1);
      }
    }
  }

  if (contagem.size === 0) return new Date().getFullYear();
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Interpreta linhas de texto já reconstruídas a partir de um PDF.
 *
 * Formato esperado, que é o da maioria dos extratos brasileiros:
 *   data | descrição | valor [| saldo]
 * Quando há dois valores na linha, o primeiro é o lançamento e o segundo é o
 * saldo acumulado — que precisa ser descartado, senão viraria transação.
 */
export function lerExtratoPDF(linhas: string[]): ResultadoLeitura {
  const ano = descobrirAno(linhas);
  const resultado: LinhaBruta[] = [];
  let ignoradas = 0;

  for (const linha of linhas) {
    const limpa = linha.trim();
    if (!limpa || LINHAS_IGNORADAS.test(limpa)) continue;

    const inicio = limpa.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
    if (!inicio) {
      ignoradas++;
      continue;
    }

    const [, dia, mes, anoNaLinha] = inicio;
    let anoFinal = ano;
    if (anoNaLinha) {
      anoFinal =
        anoNaLinha.length === 2
          ? Number(anoNaLinha) > 70
            ? 1900 + Number(anoNaLinha)
            : 2000 + Number(anoNaLinha)
          : Number(anoNaLinha);
    }

    const data = lerData(
      `${dia.padStart(2, "0")}/${mes.padStart(2, "0")}/${anoFinal}`,
    );
    if (!data) {
      ignoradas++;
      continue;
    }

    const resto = limpa.slice(inicio[0].length);
    const valores = resto.match(MOEDA);
    if (!valores || valores.length === 0) {
      ignoradas++;
      continue;
    }

    const valor = lerValor(valores[0]);
    if (valor === null || valor === 0) {
      ignoradas++;
      continue;
    }

    // A descrição é o que sobra antes do primeiro valor monetário.
    const posicaoValor = resto.indexOf(valores[0]);
    const descricao =
      resto.slice(0, posicaoValor).replace(/\s+/g, " ").trim() ||
      "Sem descrição";

    resultado.push({ data, descricao, valor });
  }

  if (resultado.length === 0) {
    throw new Error(
      "Não encontrei lançamentos neste PDF. Se o extrato for digitalizado " +
        "(imagem), o texto não pode ser lido automaticamente.",
    );
  }

  return { linhas: resultado, ignoradas, formato: "pdf" };
}
