/**
 * Validação das variáveis de ambiente do Supabase.
 *
 * Fica num módulo próprio, sem importar `next/headers`, para poder ser usado
 * também pelo middleware, que roda no runtime edge.
 *
 * Valida o formato, não só a presença: uma URL inválida faz o cliente do
 * Supabase lançar exceção na criação, e no middleware isso derruba todas as
 * rotas de uma vez. Melhor tratar como "não configurado" e mostrar as
 * instruções.
 */
export function supabaseConfigurado(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url?.trim() || !chave?.trim()) return false;

  try {
    const { protocol } = new URL(url.trim());
    // Uma string de conexão postgresql:// aqui é o engano mais comum.
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
