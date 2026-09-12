/**
 * Esqueleto exibido enquanto a página do lado servidor busca os dados.
 *
 * Sem isto, o App Router segura a navegação inteira até o servidor responder,
 * e trocar de aba parece travado. Com o esqueleto a troca é imediata e o
 * conteúdo entra por cima.
 */
export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-[var(--color-painel)]" />
      <div className="mt-2 h-4 w-56 rounded bg-[var(--color-painel)]" />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="painel">
            <div className="h-3 w-20 rounded bg-[var(--color-painel-alto)]" />
            <div className="mt-3 h-6 w-28 rounded bg-[var(--color-painel-alto)]" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="painel">
            <div className="h-3 w-36 rounded bg-[var(--color-painel-alto)]" />
            <div className="mt-4 h-[260px] rounded-xl bg-[var(--color-painel-alto)]" />
          </div>
        ))}
      </div>
    </div>
  );
}
