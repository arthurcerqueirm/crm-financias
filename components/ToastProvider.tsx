"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type Toast = {
  id: string;
  mensagem: string;
  tipo: "info" | "sucesso" | "erro";
  acaoLabel?: string;
  aoAcao?: () => void;
};

type OpcoesNotificar = {
  mensagem: string;
  tipo?: Toast["tipo"];
  acaoLabel?: string;
  aoAcao?: () => void;
  duracaoMs?: number;
};

type ContextoToast = {
  notificar: (opcoes: OpcoesNotificar) => string;
  fechar: (id: string) => void;
};

const Contexto = createContext<ContextoToast | null>(null);

export function useToast(): ContextoToast {
  const ctx = useContext(Contexto);
  if (!ctx) throw new Error("useToast precisa estar dentro de <ToastProvider>.");
  return ctx;
}

/**
 * Avisos discretos no rodapé da tela, com botão de ação opcional — usado
 * sobretudo para "Excluído. Desfazer", já que exclusão em silêncio (sem
 * confirm() nativo) só é segura se a pessoa tem alguns segundos para voltar
 * atrás.
 */
export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const contador = useRef(0);
  const temporizadores = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fechar = useCallback((id: string) => {
    const t = temporizadores.current.get(id);
    if (t) {
      clearTimeout(t);
      temporizadores.current.delete(id);
    }
    setToasts((atual) => atual.filter((x) => x.id !== id));
  }, []);

  const notificar = useCallback(
    (opcoes: OpcoesNotificar) => {
      const id = `toast-${++contador.current}`;
      const duracao = opcoes.duracaoMs ?? 5000;
      setToasts((atual) => [
        ...atual,
        { id, tipo: opcoes.tipo ?? "info", mensagem: opcoes.mensagem, acaoLabel: opcoes.acaoLabel, aoAcao: opcoes.aoAcao },
      ]);
      const temporizador = setTimeout(() => {
        temporizadores.current.delete(id);
        setToasts((atual) => atual.filter((x) => x.id !== id));
      }, duracao);
      temporizadores.current.set(id, temporizador);
      return id;
    },
    [],
  );

  return (
    <Contexto.Provider value={{ notificar, fechar }}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end lg:pr-8"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border bg-[var(--color-painel-alto)] px-4 py-3 text-sm shadow-xl ${
              t.tipo === "erro"
                ? "border-[var(--color-vermelho)]/40"
                : t.tipo === "sucesso"
                  ? "border-[var(--color-verde)]/40"
                  : "border-[var(--color-borda)]"
            }`}
          >
            <span className="flex-1">{t.mensagem}</span>
            {t.acaoLabel && (
              <button
                type="button"
                onClick={() => {
                  t.aoAcao?.();
                  fechar(t.id);
                }}
                className="shrink-0 rounded px-1.5 py-1 font-semibold text-[var(--color-verde)]"
              >
                {t.acaoLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </Contexto.Provider>
  );
}
