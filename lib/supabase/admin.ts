import { createClient as criarClienteSupabase } from "@supabase/supabase-js";

/**
 * Cliente com a service role key — ignora RLS e pode agir em nome de
 * qualquer usuário (aqui, só para apagar a própria conta). Nunca importe
 * este arquivo de um componente "use client": a chave não tem o prefixo
 * NEXT_PUBLIC_, então o Next não a inclui no bundle do navegador, mas o
 * arquivo em si só deve ser tocado por código que roda no servidor (rotas
 * de API, Server Components).
 */
export function temChaveAdmin(): boolean {
  return !!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada neste deploy.");
  }
  return criarClienteSupabase(url, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
