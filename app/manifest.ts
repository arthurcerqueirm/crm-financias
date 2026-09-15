import type { MetadataRoute } from "next";

/**
 * Manifesto de Web App — permite "Adicionar à tela de início" no celular com
 * ícone, nome e cor próprios, em vez de virar mais uma aba de navegador
 * indistinguível das outras.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Minhas Finanças",
    short_name: "Finanças",
    description:
      "CRM pessoal de finanças — controle de gastos, receitas e patrimônio",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1017",
    theme_color: "#0b1017",
    lang: "pt-BR",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
