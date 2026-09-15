export default function Carregando() {
  return (
    <div className="animate-pulse">
      <div className="h-7 w-48 rounded-lg bg-[var(--color-painel)]" />
      <div className="mt-2 h-4 w-96 max-w-full rounded bg-[var(--color-painel)]" />

      <div className="mt-5 painel space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-16 rounded-xl bg-[var(--color-painel-alto)]" />
          <div className="h-16 rounded-xl bg-[var(--color-painel-alto)]" />
        </div>
        <div className="h-32 rounded-2xl border-2 border-dashed border-[var(--color-borda)]" />
      </div>
    </div>
  );
}
