"use client";

import { useEffect, useState } from "react";

type Tema = "sistema" | "claro" | "escuro";

const PROXIMO: Record<Tema, Tema> = {
  sistema: "claro",
  claro: "escuro",
  escuro: "sistema",
};

const ROTULO: Record<Tema, string> = {
  sistema: "Automático (segue o sistema)",
  claro: "Claro",
  escuro: "Escuro",
};

const ICONE: Record<Tema, string> = {
  sistema: "◐",
  claro: "☀",
  escuro: "☾",
};

/**
 * Alterna entre claro / escuro / automático, num ciclo de 3 estados. A
 * escolha explícita fica em localStorage e vira o atributo data-theme na
 * raiz do documento — o CSS (globals.css) já sabe reagir a ele. O estado
 * inicial de verdade é aplicado antes da hidratação por um <script> no
 * layout raiz (evita o flash do tema errado); aqui só sincronizamos o
 * ícone do botão com o que já está no localStorage.
 */
export default function AlternadorTema({ className = "" }: { className?: string }) {
  const [tema, setTema] = useState<Tema>("sistema");

  useEffect(() => {
    try {
      const salvo = localStorage.getItem("tema");
      if (salvo === "claro" || salvo === "escuro") setTema(salvo);
    } catch {
      // localStorage indisponível (modo privado, política de cookies) — fica no automático.
    }
  }, []);

  function aplicar(novo: Tema) {
    setTema(novo);
    try {
      if (novo === "sistema") localStorage.removeItem("tema");
      else localStorage.setItem("tema", novo);
    } catch {
      // Sem persistência, mas ainda aplica para esta visita.
    }
    if (novo === "sistema") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute(
        "data-theme",
        novo === "claro" ? "light" : "dark",
      );
    }
  }

  return (
    <button
      type="button"
      onClick={() => aplicar(PROXIMO[tema])}
      className={className}
      aria-label={`Tema: ${ROTULO[tema]}. Toque para trocar.`}
      title={`Tema: ${ROTULO[tema]}`}
    >
      <span aria-hidden="true">{ICONE[tema]}</span>
    </button>
  );
}
