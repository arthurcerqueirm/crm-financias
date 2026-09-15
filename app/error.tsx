"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Boundary de erro do App Router — cobre qualquer exceção não tratada nas
 * páginas dentro de app/layout.tsx (o grupo autenticado e o /login). Sem
 * isto, um erro de renderização mostrava a tela crua e genérica do Next,
 * sem caminho de volta.
 */
export default function ErroApp({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erro não tratado:", error);
  }, [error]);

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <p className="text-3xl">⚠️</p>
      <h1 className="mt-3 text-xl font-bold">Algo deu errado</h1>
      <p className="mt-2 text-sm text-[var(--color-suave)]">
        A página encontrou um erro inesperado. Nenhum dado foi perdido — tente de
        novo ou volte ao painel.
      </p>

      <div className="mt-6 flex gap-2">
        <Link href="/" className="botao-secundario">
          Voltar ao painel
        </Link>
        <button onClick={() => reset()} className="botao">
          Tentar de novo
        </button>
      </div>

      {error.digest && (
        <p className="mt-6 text-xs text-[var(--color-suave)]/60">
          Código: {error.digest}
        </p>
      )}
    </main>
  );
}
