export default function ConfiguracaoPendente() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">Falta configurar o Supabase</h1>
      <p className="mt-2 text-[15px] text-[var(--color-suave)]">
        O app está no ar, mas ainda não sabe em qual banco de dados gravar. Defina
        estas variáveis de ambiente e faça o redeploy:
      </p>

      <div className="painel mt-5 font-mono text-[13px] leading-7">
        <p className="text-[var(--color-verde)]">NEXT_PUBLIC_SUPABASE_URL</p>
        <p className="text-[var(--color-verde)]">NEXT_PUBLIC_SUPABASE_ANON_KEY</p>
        <p className="text-[var(--color-suave)]">
          ANTHROPIC_API_KEY{" "}
          <span className="not-italic">(opcional, para a análise com IA)</span>
        </p>
      </div>

      <ol className="mt-6 space-y-2 text-[15px] text-[var(--color-suave)]">
        <li>
          <strong className="text-[var(--color-texto)]">1.</strong> No Supabase,
          abra <em>Project Settings → API</em> e copie a URL e a chave{" "}
          <em>anon public</em>.
        </li>
        <li>
          <strong className="text-[var(--color-texto)]">2.</strong> Na Vercel,
          abra <em>Settings → Environment Variables</em> e cole as duas.
        </li>
        <li>
          <strong className="text-[var(--color-texto)]">3.</strong> Rode o arquivo{" "}
          <code className="text-[var(--color-texto)]">supabase/schema.sql</code>{" "}
          no SQL Editor do Supabase.
        </li>
        <li>
          <strong className="text-[var(--color-texto)]">4.</strong> Faça o
          redeploy.
        </li>
      </ol>
    </main>
  );
}
