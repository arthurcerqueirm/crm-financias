import { NextResponse } from "next/server";
import { createClient, supabaseConfigurado } from "@/lib/supabase/server";
import { criarClienteAdmin, temChaveAdmin } from "@/lib/supabase/admin";

/**
 * Apaga a conta do usuário logado de vez. Todas as tabelas do app referenciam
 * auth.users(id) com "on delete cascade" (ver supabase/schema.sql), então
 * apagar o usuário no Auth já leva junto transações, categorias, contas,
 * patrimônio, análises e o contador de uso de IA — sem precisar apagar
 * tabela por tabela aqui.
 */
export async function POST() {
  if (!supabaseConfigurado()) {
    return NextResponse.json(
      { erro: "O Supabase ainda não foi configurado neste deploy." },
      { status: 503 },
    );
  }

  if (!temChaveAdmin()) {
    return NextResponse.json(
      {
        erro:
          "Excluir conta não está disponível: falta configurar SUPABASE_SERVICE_ROLE_KEY na Vercel (Project Settings → API, no Supabase).",
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Você precisa estar logado." }, { status: 401 });
  }

  const admin = criarClienteAdmin();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
