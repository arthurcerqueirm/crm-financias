import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigurado } from "@/lib/config";

const ROTAS_PUBLICAS = ["/login", "/auth"];

export async function atualizarSessao(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Sem configuração válida, deixa passar para a página mostrar as instruções.
  if (!supabaseConfigurado()) {
    return response;
  }

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value),
            );
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options),
            );
          },
        },
      },
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ehPublica = ROTAS_PUBLICAS.some((rota) =>
      request.nextUrl.pathname.startsWith(rota),
    );

    if (!user && !ehPublica) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    if (user && request.nextUrl.pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  } catch (erro) {
    // O middleware roda em toda requisição: se ele lançar, o site inteiro
    // responde 500. Melhor registrar e seguir sem sessão — as páginas
    // protegidas continuam checando o usuário no servidor.
    console.error("Falha ao renovar a sessão no middleware:", erro);
    return response;
  }
}
