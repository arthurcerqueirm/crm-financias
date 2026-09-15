"use client";

import { useEffect, useRef } from "react";

const SELETOR_FOCAVEL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Diálogo modal acessível: fecha com Esc, prende o foco dentro dele (Tab não
 * escapa para o conteúdo por trás), trava o scroll do fundo e devolve o foco
 * a quem abriu ao fechar. Todo modal e bottom-sheet do app usa este mesmo
 * componente por baixo, em vez de reimplementar isso em cada formulário.
 */
export default function Modal({
  aberto,
  aoFechar,
  children,
  labelledBy,
  className = "",
  posicionamento = "centro",
}: {
  aberto: boolean;
  aoFechar: () => void;
  children: React.ReactNode;
  /** id do elemento (geralmente um <h2>) que nomeia o diálogo para leitores de tela. */
  labelledBy?: string;
  className?: string;
  posicionamento?: "centro" | "base";
}) {
  const conteudoRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!aberto) return;

    gatilhoRef.current = document.activeElement;
    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const primeiroFocavel =
      conteudoRef.current?.querySelector<HTMLElement>(SELETOR_FOCAVEL);
    primeiroFocavel?.focus();

    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        aoFechar();
        return;
      }
      if (evento.key !== "Tab") return;

      const focaveis = Array.from(
        conteudoRef.current?.querySelectorAll<HTMLElement>(SELETOR_FOCAVEL) ?? [],
      );
      if (focaveis.length === 0) return;

      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];

      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      document.body.style.overflow = overflowOriginal;
      if (gatilhoRef.current instanceof HTMLElement) {
        gatilhoRef.current.focus();
      }
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm ${
        posicionamento === "base"
          ? "items-end justify-center p-0 sm:items-center sm:p-4"
          : "items-center justify-center p-4"
      }`}
      onClick={aoFechar}
    >
      <div
        ref={conteudoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => e.stopPropagation()}
        className={className}
      >
        {children}
      </div>
    </div>
  );
}
