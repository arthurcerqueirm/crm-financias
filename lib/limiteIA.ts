import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Limites diários de uso de IA, por usuário.
 *
 * O cadastro é aberto por padrão no Supabase — qualquer pessoa pode criar
 * uma conta e, sem isso, chamar as rotas de IA à vontade na sua chave da
 * Anthropic. Os números abaixo são generosos para o uso normal de uma
 * pessoa (importar extratos e pedir a análise mensal) e baixos o bastante
 * para limitar o estrago de um uso abusivo.
 */
export const LIMITE_ANALISES_POR_DIA = 15;
export const LIMITE_ITENS_CATEGORIZADOS_POR_DIA = 1500;
export const LIMITE_PDF_IA_POR_DIA = 15;

/** Teto de itens que uma única importação manda para a IA categorizar. */
export const LIMITE_ITENS_IA_POR_IMPORTACAO = 400;

type Uso = {
  analises: number;
  itens_categorizados: number;
  paginas_pdf_lidas: number;
};

/**
 * Incrementa o contador do dia e devolve se a operação pode prosseguir.
 * O incremento é atômico no banco (função SECURITY DEFINER com upsert),
 * então duas requisições em paralelo não conseguem passar do limite juntas.
 */
export async function registrarUso(
  supabase: SupabaseClient,
  incremento: { analises?: number; itens?: number; pdf?: number },
): Promise<{ ok: true; uso: Uso } | { ok: false; motivo: string }> {
  const { data, error } = await supabase
    .rpc("registrar_uso_ia", {
      p_analises: incremento.analises ?? 0,
      p_itens: incremento.itens ?? 0,
      p_pdf: incremento.pdf ?? 0,
    })
    .single();

  if (error || !data) {
    // Se o contador falhar, a chamada de IA não acontece — mais seguro
    // recusar do que deixar passar sem controle de custo.
    return {
      ok: false,
      motivo: "Não consegui verificar o limite de uso da IA. Tente de novo em instantes.",
    };
  }

  const uso = data as Uso;

  if (incremento.analises && uso.analises > LIMITE_ANALISES_POR_DIA) {
    return {
      ok: false,
      motivo: `Limite de ${LIMITE_ANALISES_POR_DIA} análises por dia atingido. Volte amanhã.`,
    };
  }
  if (
    incremento.itens &&
    uso.itens_categorizados > LIMITE_ITENS_CATEGORIZADOS_POR_DIA
  ) {
    return {
      ok: false,
      motivo: `Limite diário de categorização por IA atingido (${LIMITE_ITENS_CATEGORIZADOS_POR_DIA} itens). O que sobrou entra sem categoria — ajuste na mão ou volte amanhã.`,
    };
  }
  if (incremento.pdf && uso.paginas_pdf_lidas > LIMITE_PDF_IA_POR_DIA) {
    return {
      ok: false,
      motivo: `Limite de ${LIMITE_PDF_IA_POR_DIA} PDFs lidos por IA por dia atingido. Volte amanhã.`,
    };
  }

  return { ok: true, uso };
}
