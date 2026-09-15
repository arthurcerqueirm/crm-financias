"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";
import ConfirmDialog from "@/components/ConfirmDialog";
import AlternadorTema from "@/components/AlternadorTema";
import { useConfirmacao } from "@/lib/useConfirmacao";

// Ordem usada na barra lateral do desktop (cabe tudo, sem sacrifício).
const ITENS = [
  { href: "/", rotulo: "Painel", icone: "◎" },
  { href: "/transacoes", rotulo: "Transações", icone: "≡" },
  { href: "/importar", rotulo: "Importar", icone: "↑" },
  { href: "/patrimonio", rotulo: "Patrimônio", icone: "▲" },
  { href: "/analise", rotulo: "Análise IA", icone: "✦" },
  { href: "/categorias", rotulo: "Categorias", icone: "◈" },
  { href: "/contas", rotulo: "Contas", icone: "▣" },
  { href: "/perfil", rotulo: "Perfil", icone: "☺" },
];

// No celular só cabem 4 no rodapé sem espremer — o resto vai para "Mais".
const PRINCIPAIS = ["/", "/transacoes", "/importar", "/analise"];
const ITENS_PRINCIPAIS = ITENS.filter((i) => PRINCIPAIS.includes(i.href));
const ITENS_SECUNDARIOS = ITENS.filter((i) => !PRINCIPAIS.includes(i.href));

function estaAtivo(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export default function Navegacao({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [maisAberto, setMaisAberto] = useState(false);
  const confirmacaoSaida = useConfirmacao<true>();

  async function sair() {
    const ok = await confirmacaoSaida.pedir(true);
    if (!ok) return;
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const algumSecundarioAtivo = ITENS_SECUNDARIOS.some((i) =>
    estaAtivo(pathname, i.href),
  );

  return (
    <>
      {/* Desktop: barra lateral fixa */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-[var(--color-borda)] bg-[var(--color-painel)] p-4 lg:flex">
        <div className="mb-8 flex items-start justify-between gap-2 px-2 pt-2">
          <div className="min-w-0">
            <p className="text-lg font-bold tracking-tight">
              Minhas <span className="text-[var(--color-verde)]">Finanças</span>
            </p>
            <p className="mt-0.5 truncate text-xs text-[var(--color-suave)]">
              {email}
            </p>
          </div>
          <AlternadorTema className="shrink-0 rounded-lg px-2 py-1.5 text-base text-[var(--color-suave)] transition hover:bg-[var(--color-painel-alto)] hover:text-[var(--color-texto)]" />
        </div>

        <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1">
          {ITENS.map((item) => {
            const ativo = estaAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  ativo
                    ? "bg-[var(--color-verde)]/12 text-[var(--color-verde)]"
                    : "text-[var(--color-suave)] hover:bg-[var(--color-painel-alto)] hover:text-[var(--color-texto)]"
                }`}
              >
                <span aria-hidden="true" className="w-4 text-center text-base">
                  {item.icone}
                </span>
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
        <span className="flex items-center gap-1">
          <AlternadorTema className="rounded-lg px-2 py-1.5 text-base text-[var(--color-suave)]" />
          <button
            onClick={sair}
            className="rounded px-2 py-1.5 text-xs font-medium text-[var(--color-suave)]"
          >
            Sair
          </button>
        </span>
      </header>

      <nav
        aria-label="Navegação principal"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-[var(--color-borda)] bg-[var(--color-painel)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {ITENS_PRINCIPAIS.map((item) => {
          const ativo = estaAtivo(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={ativo ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                ativo ? "text-[var(--color-verde)]" : "text-[var(--color-suave)]"
              }`}
            >
              <span aria-hidden="true" className="text-base leading-none">
                {item.icone}
              </span>
              {item.rotulo}
            </Link>
          );
        })}
        <button
          onClick={() => setMaisAberto(true)}
          aria-haspopup="dialog"
          className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
            algumSecundarioAtivo
              ? "text-[var(--color-verde)]"
              : "text-[var(--color-suave)]"
          }`}
        >
          <span aria-hidden="true" className="text-base leading-none">
            ⋯
          </span>
          Mais
        </button>
      </nav>

      <Modal
        aberto={maisAberto}
        aoFechar={() => setMaisAberto(false)}
        posicionamento="base"
        labelledBy="titulo-mais"
        className="w-full rounded-t-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] lg:hidden"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-borda)]" />
        <h2 id="titulo-mais" className="sr-only">
          Mais opções
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {ITENS_SECUNDARIOS.map((item) => {
            const ativo = estaAtivo(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMaisAberto(false)}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-4 text-xs font-medium transition ${
                  ativo
                    ? "bg-[var(--color-verde)]/12 text-[var(--color-verde)]"
                    : "text-[var(--color-suave)] hover:bg-[var(--color-painel-alto)]"
                }`}
              >
                <span aria-hidden="true" className="text-xl leading-none">
                  {item.icone}
                </span>
                {item.rotulo}
              </Link>
            );
          })}
        </div>
      </Modal>

      {confirmacaoSaida.alvo && (
        <ConfirmDialog
          aberto
          titulo="Sair da conta"
          mensagem="Você vai precisar entrar de novo com seu e-mail e senha para acessar suas finanças."
          rotuloConfirmar="Sair"
          perigo={false}
          aoConfirmar={confirmacaoSaida.confirmar}
          aoCancelar={confirmacaoSaida.cancelar}
        />
      )}
    </>
  );
}
