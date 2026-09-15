import { test } from "node:test";
import assert from "node:assert/strict";
import { lerData, lerExtrato, lerExtratoPDF, normalizar, gerarHash } from "@/lib/extrato";

test("lerData - formatos brasileiro, ISO e OFX", () => {
  assert.equal(lerData("15/03/2026"), "2026-03-15");
  assert.equal(lerData("2026-03-15"), "2026-03-15");
  assert.equal(lerData("20260315120000[-3:BRT]"), "2026-03-15");
  assert.equal(lerData("05-01-26"), "2026-01-05");
});

test("lerData - datas implausíveis devolvem null", () => {
  assert.equal(lerData("32/13/2026"), null);
  assert.equal(lerData("abc"), null);
});

test("normalizar - remove acento e padroniza espaço", () => {
  assert.equal(normalizar("  Mercado   Público  "), "mercado publico");
  assert.equal(normalizar("Ração"), "racao");
});

test("gerarHash - mesma entrada gera o mesmo hash, entradas diferentes não colidem", () => {
  const a = gerarHash("2026-03-01", -50, "Padaria", 0);
  const b = gerarHash("2026-03-01", -50, "Padaria", 0);
  const c = gerarHash("2026-03-01", -50, "Padaria", 1); // segunda ocorrência no dia
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test("lerExtrato - CSV do Nubank (vírgula, cabeçalho em português)", () => {
  const csv = `Data,Valor,Identificador,Descrição
15/03/2026,-45.90,abc-1,Pagamento no débito - IFOOD
16/03/2026,-120.00,abc-2,Compra no débito - POSTO SHELL
20/03/2026,5000.00,abc-3,Transferência recebida - SALARIO`;

  const r = lerExtrato(csv, "nubank.csv");
  assert.equal(r.formato, "csv");
  assert.equal(r.linhas.length, 3);
  assert.deepEqual(r.linhas[0], {
    data: "2026-03-15",
    descricao: "Pagamento no débito - IFOOD",
    valor: -45.9,
  });
});

test("lerExtrato - CSV do Itaú (ponto e vírgula, preâmbulo antes da tabela)", () => {
  const csv = `"extrato conta corrente"
"agencia: 1234 conta: 56789-0"
"periodo: 01/03/2026 a 31/03/2026"
data;lançamento;valor;saldo
01/03/2026;SALARIO EMPRESA XPTO;5.000,00;5.000,00
03/03/2026;PIX ENVIADO MARIA;-250,00;4.750,00
05/03/2026;SUPERMERCADO PAO DE ACUCAR;-432,15;4.317,85`;

  const r = lerExtrato(csv, "itau.csv");
  assert.equal(r.linhas.length, 3);
  assert.equal(r.linhas[2].valor, -432.15);
  assert.equal(r.linhas[1].descricao, "PIX ENVIADO MARIA");
});

test("lerExtrato - Bradesco com colunas separadas de crédito e débito", () => {
  const csv = `Data;Histórico;Crédito;Débito
10/03/2026;DEPOSITO;1.500,00;
12/03/2026;TARIFA MENSALIDADE;;29,90`;

  const r = lerExtrato(csv, "bradesco.csv");
  assert.equal(r.linhas[0].valor, 1500);
  assert.equal(r.linhas[1].valor, -29.9);
});

test("lerExtrato - coluna de tipo D/C manda no sinal", () => {
  const csv = `Data;Descricao;Valor;Tipo
01/04/2026;COMPRA MERCADO;150,00;D
02/04/2026;ESTORNO;75,00;C`;

  const r = lerExtrato(csv, "tipo.csv");
  assert.equal(r.linhas[0].valor, -150);
  assert.equal(r.linhas[1].valor, 75);
});

test("lerExtrato - OFX", () => {
  const ofx = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20260315<TRNAMT>-45.90<FITID>1<MEMO>IFOOD*RESTAURANTE</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20260320<TRNAMT>5000.00<FITID>2<NAME>SALARIO</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;

  const r = lerExtrato(ofx, "extrato.ofx");
  assert.equal(r.formato, "ofx");
  assert.equal(r.linhas.length, 2);
  assert.equal(r.linhas[0].descricao, "IFOOD*RESTAURANTE");
  assert.equal(r.linhas[1].descricao, "SALARIO");
});

test("lerExtrato - CSV sem cabeçalho reconhecível deduz as colunas pelo conteúdo", () => {
  const csv = `20/03/2026;PADARIA CENTRAL;-18,50
21/03/2026;UBER VIAGEM;-23,70
22/03/2026;FREELA SITE;800,00`;

  const r = lerExtrato(csv, "cru.csv");
  assert.equal(r.linhas.length, 3);
  assert.equal(r.linhas[0].descricao, "PADARIA CENTRAL");
  assert.equal(r.linhas[2].valor, 800);
});

test("lerExtrato - arquivo vazio ou sem transações reconhecíveis lança erro", () => {
  assert.throws(() => lerExtrato("", "vazio.csv"));
  assert.throws(() => lerExtrato("cabecalho;sem;dados\n", "sem-dados.csv"));
});

// --- PDF: testa a interpretação das linhas já reconstruídas, sem precisar
// gerar bytes de PDF de verdade (isso é papel de extrairLinhasPDF/pdf.js).
test("lerExtratoPDF - layout do Itaú: data sem ano, saldo descartado, linhas de saldo ignoradas", () => {
  const linhas = [
    "Banco Itau  -  Extrato de Conta Corrente",
    "Periodo de 01/03/2026 a 31/03/2026",
    "data lancamento valor saldo",
    "01/03 SALDO ANTERIOR 1.234,56",
    "03/03 PIX TRANSF MARIA SILVA -250,00 984,56",
    "05/03 SUPERMERCADO PAO DE ACUCAR -432,15 552,41",
    "10/03 SALARIO EMPRESA XPTO LTDA 5.000,00 5.506,51",
    "31/03 SALDO FINAL 4.252,91",
    "Pagina 1 de 1",
  ];

  const r = lerExtratoPDF(linhas);
  assert.equal(r.formato, "pdf");
  assert.equal(r.linhas.length, 3);
  assert.deepEqual(
    r.linhas.map((l) => l.data),
    ["2026-03-03", "2026-03-05", "2026-03-10"],
  );
  assert.equal(r.linhas[1].valor, -432.15); // não pegou o saldo acumulado
  assert.equal(r.linhas[2].valor, 5000);
});

test("lerExtratoPDF - sem nenhum lançamento reconhecível lança erro", () => {
  assert.throws(() => lerExtratoPDF(["texto qualquer sem data nem valor"]));
});
