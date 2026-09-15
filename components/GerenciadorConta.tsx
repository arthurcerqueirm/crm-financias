"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Modal from "@/components/Modal";

export default function GerenciadorConta({ email }: { email: string }) {
  const [excluirAberto, setExcluirAberto] = useState(false);

  return (
    <div className="space-y-4">
      <div className="painel">
        <p className="titulo-painel">Sua conta</p>
        <p className="mt-2 text-sm">{email}</p>
      </div>

      <FormularioSenha />

      <div className="painel space-y-3 border-[var(--color-vermelho)]/30">
        <p className="titulo-painel text-[var(--color-vermelho)]">Zona de risco</p>
        <p className="text-sm text-[var(--color-suave)]">
          Apaga sua conta e todos os seus dados — transações, categorias, contas,
          patrimônio e análises. Não tem como desfazer.
        </p>
        <button
          onClick={() => setExcluirAberto(true)}
          className="botao-perigo"
        >
          Excluir minha conta
        </button>
      </div>

      {excluirAberto && (
        <ModalExcluirConta email={email} aoFechar={() => setExcluirAberto(false)} />
      )}
    </div>
  );
}

function FormularioSenha() {
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);

    if (senha.length < 6) {
      setErro("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }

    setSalvando(true);
    const { error } = await createClient().auth.updateUser({ password: senha });
    if (error) {
      setErro(error.message);
    } else {
      setSucesso("Senha alterada com sucesso.");
      setSenha("");
      setConfirmacao("");
    }
    setSalvando(false);
  }

  return (
    <form onSubmit={enviar} className="painel space-y-4">
      <p className="titulo-painel">Trocar senha</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="rotulo" htmlFor="nova-senha">
            Nova senha
          </label>
          <input
            id="nova-senha"
            type="password"
            className="campo"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </div>
        <div>
          <label className="rotulo" htmlFor="confirmar-senha">
            Confirmar nova senha
          </label>
          <input
            id="confirmar-senha"
            type="password"
            className="campo"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            minLength={6}
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </div>
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
          {erro}
        </p>
      )}
      {sucesso && (
        <p
          role="status"
          className="rounded-xl border border-[var(--color-verde)]/30 bg-[var(--color-verde)]/10 px-3 py-2.5 text-sm text-[var(--color-verde)]"
        >
          {sucesso}
        </p>
      )}

      <button type="submit" disabled={salvando} className="botao">
        {salvando ? "Salvando..." : "Salvar nova senha"}
      </button>
    </form>
  );
}

function ModalExcluirConta({
  email,
  aoFechar,
}: {
  email: string;
  aoFechar: () => void;
}) {
  const router = useRouter();
  const [confirmacaoTexto, setConfirmacaoTexto] = useState("");
  const [excluindo, setExcluindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeExcluir = confirmacaoTexto.trim().toLowerCase() === email.toLowerCase();

  async function excluir() {
    if (!podeExcluir) return;
    setExcluindo(true);
    setErro(null);
    try {
      const resposta = await fetch("/api/conta/excluir", { method: "POST" });
      const json = await resposta.json();
      if (!resposta.ok) {
        setErro(json.erro ?? "Não consegui excluir a conta.");
        setExcluindo(false);
        return;
      }
      await createClient().auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      setErro("Falha de conexão ao excluir a conta.");
      setExcluindo(false);
    }
  }

  return (
    <Modal
      aberto
      aoFechar={aoFechar}
      labelledBy="titulo-excluir-conta"
      className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--color-vermelho)]/30 bg-[var(--color-painel)] p-5"
    >
      <h2 id="titulo-excluir-conta" className="text-lg font-bold text-[var(--color-vermelho)]">
        Excluir conta
      </h2>
      <p className="text-sm leading-relaxed text-[var(--color-suave)]">
        Isso apaga sua conta e <strong className="text-[var(--color-texto)]">todos</strong> os
        seus dados — transações, categorias, contas, patrimônio e análises.
        Não tem como desfazer.
      </p>

      <div>
        <label className="rotulo" htmlFor="confirmacao-email">
          Digite <span className="font-mono text-[var(--color-texto)]">{email}</span> para
          confirmar
        </label>
        <input
          id="confirmacao-email"
          className="campo"
          value={confirmacaoTexto}
          onChange={(e) => setConfirmacaoTexto(e.target.value)}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
        />
      </div>

      {erro && (
        <p
          role="alert"
          className="rounded-xl border border-[var(--color-vermelho)]/30 bg-[var(--color-vermelho)]/10 px-3 py-2.5 text-sm text-[var(--color-vermelho)]"
        >
          {erro}
        </p>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={aoFechar} className="botao-secundario flex-1">
          Cancelar
        </button>
        <button
          type="button"
          onClick={excluir}
          disabled={!podeExcluir || excluindo}
          className="botao-perigo flex-1"
        >
          {excluindo ? "Excluindo..." : "Excluir tudo, permanentemente"}
        </button>
      </div>
    </Modal>
  );
}
