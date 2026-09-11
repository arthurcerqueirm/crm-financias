"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function FormularioLogin() {
  const router = useRouter();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setCarregando(true);
    setErro(null);
    setAviso(null);

    const supabase = createClient();

    if (modo === "entrar") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      if (error) {
        setErro(
          error.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : error.message,
        );
        setCarregando(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
    });
    if (error) {
      setErro(
        error.message.includes("at least")
          ? "A senha precisa ter pelo menos 6 caracteres."
          : error.message,
      );
      setCarregando(false);
      return;
    }

    // Sem sessão na resposta = o projeto exige confirmação por e-mail.
    if (!data.session) {
      setAviso(
        "Conta criada. Confirme o e-mail que acabamos de enviar e depois entre.",
      );
      setModo("entrar");
      setCarregando(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="painel space-y-4">
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-[var(--color-fundo)] p-1">
        {(["entrar", "criar"] as const).map((opcao) => (
          <button
            key={opcao}
            type="button"
            onClick={() => {
              setModo(opcao);
              setErro(null);
            }}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              modo === opcao
                ? "bg-[var(--color-painel-alto)] text-[var(--color-texto)]"
                : "text-[var(--color-suave)]"
            }`}
          >
            {opcao === "entrar" ? "Entrar" : "Criar conta"}
          </button>
        ))}
      </div>

      <div>
        <label className="rotulo" htmlFor="email">
          E-mail
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          className="campo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@email.com"
        />
      </div>

      <div>
        <label className="rotulo" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          required
          minLength={6}
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
          className="campo"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      {erro && (
        <p className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]">
          {erro}
        </p>
      )}
      {aviso && (
        <p className="rounded-xl border border-[var(--color-verde)]/30 bg-[var(--color-verde)]/10 px-3 py-2.5 text-sm text-[var(--color-verde)]">
          {aviso}
        </p>
      )}

      <button type="submit" disabled={carregando} className="botao w-full">
        {carregando
          ? "Aguarde..."
          : modo === "entrar"
            ? "Entrar"
            : "Criar minha conta"}
      </button>
    </form>
  );
}
