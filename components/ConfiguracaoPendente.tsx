export default function ConfiguracaoPendente() {
  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-5 py-10">
      <h1 className="text-2xl font-bold">Falta configurar o Supabase</h1>
      <p className="mt-2 text-[15px] text-[var(--color-suave)]">
        O app está no ar, mas ainda não sabe em qual banco de dados gravar — ou a
        configuração atual está em formato inválido. Ajuste estas variáveis de
        ambiente e faça o redeploy:
      </p>

      <div className="painel mt-5 space-y-3 text-[13px]">
        <div>
          <p className="font-mono text-[var(--color-verde)]">
            NEXT_PUBLIC_SUPABASE_URL
          </p>
          <p className="mt-0.5 text-[var(--color-suave)]">
            Precisa ser o endereço HTTPS do projeto, no formato{" "}
            <span className="font-mono text-[var(--color-texto)]">
              https://xxxxx.supabase.co
            </span>
          </p>
          <p className="mt-1 text-[var(--color-vermelho)]">
            Não use aqui a string de conexão{" "}
            <span className="font-mono">postgresql://...</span> — é o engano mais
            comum, e o app não sobe com ela.
          </p>
        </div>

        <div>
          <p className="font-mono text-[var(--color-verde)]">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </p>
          <p className="mt-0.5 text-[var(--color-suave)]">
            A chave <em>anon public</em>, um texto longo começando com{" "}
            <span className="font-mono text-[var(--color-texto)]">eyJ</span>
          </p>
        </div>

        <div>
          <p className="font-mono text-[var(--color-suave)]">ANTHROPIC_API_KEY</p>
          <p className="mt-0.5 text-[var(--color-suave)]">
            Opcional, só para a análise com IA.
          </p>
        </div>
      </div>

      <ol className="mt-6 space-y-2 text-[15px] text-[var(--color-suave)]">
        <li>
          <strong className="text-[var(--color-texto)]">1.</strong> No Supabase,
          abra <em>Project Settings → API</em> e copie a{" "}
          <em>Project URL</em> e a chave <em>anon public</em>.
        </li>
        <li>
          <strong className="text-[var(--color-texto)]">2.</strong> Na Vercel,
          abra <em>Settings → Environment Variables</em> e cole as duas, sem
          aspas e sem espaços sobrando.
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
