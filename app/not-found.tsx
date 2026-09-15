import Link from "next/link";

/**
 * Página 404 do App Router — sem isto, uma URL errada caía na tela crua e
 * genérica do Next, fora do tema e sem caminho de volta.
 */
export default function NaoEncontrada() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-10 text-center">
      <p className="text-3xl">🔎</p>
      <h1 className="mt-3 text-xl font-bold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-[var(--color-suave)]">
        O endereço que você tentou abrir não existe ou foi movido.
      </p>
      <Link href="/" className="botao mt-6">
        Voltar ao painel
      </Link>
    </main>
  );
}
