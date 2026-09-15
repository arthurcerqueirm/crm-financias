export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-32 rounded-lg bg-[var(--color-painel)]" />
      <div className="mt-2 h-4 w-80 rounded bg-[var(--color-painel)]" />

      <div className="mt-5 h-10 w-32 rounded-xl bg-[var(--color-painel)]" />

      <div className="mt-4 painel space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-[var(--color-painel-alto)]" />
        ))}
      </div>
    </div>
  );
}
