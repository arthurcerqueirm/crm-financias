import ConfiguracaoPendente from "@/components/ConfiguracaoPendente";
import FormularioLogin from "@/components/FormularioLogin";

export default function PaginaLogin() {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return <ConfiguracaoPendente />;
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">
          Minhas <span className="text-[var(--color-verde)]">Finanças</span>
        </h1>
        <p className="mt-2 text-[15px] text-[var(--color-suave)]">
          Todo o seu dinheiro em um lugar só: o que entra, o que sai e para onde
          está indo.
        </p>
      </div>
      <FormularioLogin />
    </main>
  );
}
