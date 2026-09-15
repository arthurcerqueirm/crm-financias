export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-40 rounded-lg bg-[var(--color-painel)]" />
        <div className="h-9 w-28 rounded-xl bg-[var(--color-painel)]" />
      </div>
      <div className="mt-2 h-4 w-56 rounded bg-[var(--color-painel)]" />

      <div className="mt-5 painel grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded-xl bg-[var(--color-painel-alto)]" />
        ))}
      </div>

      <div className="mt-4 painel space-y-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-[var(--color-painel-alto)]" />
        ))}
      </div>
    </div>
  );
}
