export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-40 rounded-lg bg-[var(--color-painel)]" />
      <div className="mt-2 h-4 w-72 rounded bg-[var(--color-painel)]" />

      <div className="mt-5 h-10 w-40 rounded-xl bg-[var(--color-painel)]" />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="painel space-y-3">
            <div className="h-3 w-20 rounded bg-[var(--color-painel-alto)]" />
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="h-10 rounded-lg bg-[var(--color-painel-alto)]" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
