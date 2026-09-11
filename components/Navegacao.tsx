"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const ITENS = [
  { href: "/", rotulo: "Painel", icone: "◎" },
  { href: "/transacoes", rotulo: "Transações", icone: "≡" },
  { href: "/importar", rotulo: "Importar", icone: "↑" },
  { href: "/patrimonio", rotulo: "Patrimônio", icone: "▲" },
  { href: "/analise", rotulo: "Análise IA", icone: "✦" },
  { href: "/categorias", rotulo: "Categorias", icone: "◈" },
];

function estaAtivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navegacao({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function sair() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--color-borda)] bg-[var(--color-painel)] p-4 lg:flex">
        <div className="mb-8 px-2 pt-2">
          <p className="text-lg font-bold tracking-tight">
            Minhas <span className="text-[var(--color-verde)]">Finanças</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-[var(--color-suave)]">
            {email}
          </p>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {ITENS.map((item) => {
            const ativo = estaAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  ativo
                    ? "bg-[var(--color-verde)]/12 text-[var(--color-verde)]"
                    : "text-[var(--color-suave)] hover:bg-[var(--color-painel-alto)] hover:text-[var(--color-texto)]"
                }`}
              >
                <span className="w-4 text-center text-base">{item.icone}</span>
                {item.rotulo}
              </Link>
            );
          })}
        </nav>

        <button
          onClick={sair}
          className="mt-4 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--color-suave)] transition hover:bg-[var(--color-painel-alto)] hover:text-[var(--color-vermelho)]"
        >
          Sair
        </button>
      </aside>

      {/* Mobile: cabeçalho + barra inferior */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--color-borda)] bg-[var(--color-fundo)]/90 px-4 py-3 backdrop-blur lg:hidden">
        <p className="font-bold tracking-tight">
          Minhas <span className="text-[var(--color-verde)]">Finanças</span>
        </p>
        <button
          onClick={sair}
          className="text-xs font-medium text-[var(--color-suave)]"
        >
          Sair
        </button>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-[var(--color-borda)] bg-[var(--color-painel)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {ITENS.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                ativo
                  ? "text-[var(--color-verde)]"
                  : "text-[var(--color-suave)]"
              }`}
            >
              <span className="text-base leading-none">{item.icone}</span>
              {item.rotulo}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
