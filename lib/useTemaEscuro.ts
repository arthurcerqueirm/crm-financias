"use client";

import { useLayoutEffect, useState } from "react";

function calcularEscuro(): boolean {
  if (typeof document === "undefined") return true;
  const atributo = document.documentElement.getAttribute("data-theme");
  if (atributo === "light") return false;
  if (atributo === "dark") return true;
  return !window.matchMedia("(prefers-color-scheme: light)").matches;
}

/**
 * Se o tema atual é escuro — para os gráficos (Recharts), que pintam cor
 * via atributos SVG (fill/stroke) em vez de classes Tailwind. Uma classe
 * como text-[var(--color-verde)] resolve sozinha pela cascata do CSS
 * quando o tema muda; um fill="#2ecc8f" fixo, não — por isso os componentes
 * de gráfico usam este hook para escolher a paleta certa em JS.
 *
 * Só usado por componentes carregados com ssr:false (ver
 * GraficosDinamicos.tsx), então não há divergência entre servidor e
 * cliente a evitar — useLayoutEffect aqui só existe para resolver o tema
 * antes da primeira pintura do gráfico, sem um frame com a cor errada.
 */
export function useTemaEscuro(): boolean {
  const [escuro, setEscuro] = useState(true);

  useLayoutEffect(() => {
    setEscuro(calcularEscuro());

    const consulta = window.matchMedia("(prefers-color-scheme: light)");
    const aoMudar = () => setEscuro(calcularEscuro());
    consulta.addEventListener("change", aoMudar);

    const observador = new MutationObserver(aoMudar);
    observador.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => {
      consulta.removeEventListener("change", aoMudar);
      observador.disconnect();
    };
  }, []);

  return escuro;
}
