export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between gap-3">
        <div className="h-7 w-36 rounded-lg bg-[var(--color-painel)]" />
        <div className="h-9 w-28 rounded-xl bg-[var(--color-painel)]" />
      </div>
      <div className="mt-2 h-4 w-72 rounded bg-[var(--color-painel)]" />

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="painel">
            <div className="h-3 w-20 rounded bg-[var(--color-painel-alto)]" />
            <div className="mt-3 h-6 w-28 rounded bg-[var(--color-painel-alto)]" />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="painel space-y-3 lg:col-span-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--color-painel-alto)]" />
          ))}
        </div>
        <div className="painel space-y-3 lg:col-span-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 rounded-lg bg-[var(--color-painel-alto)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
