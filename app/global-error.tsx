"use client";

/**
 * Cobre erros dentro do próprio app/layout.tsx (raiz), fora do alcance de
 * app/error.tsx. Precisa renderizar <html>/<body> porque substitui o
 * layout raiz inteiro — é o único lugar do app onde isso é necessário.
 */
export default function ErroGlobal({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b1017",
          color: "#e8eef5",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: "1.5rem",
        }}
      >
        <p style={{ fontSize: "2rem" }}>⚠️</p>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginTop: "0.75rem" }}>
          Algo deu errado
        </h1>
        <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#8ba0b6" }}>
          O aplicativo encontrou um erro grave. Tente recarregar a página.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: "1.5rem",
            padding: "0.625rem 1.25rem",
            borderRadius: "0.75rem",
            background: "#2ecc8f",
            color: "#04130d",
            fontWeight: 600,
            fontSize: "0.875rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Tentar de novo
        </button>
        {error.digest && (
          <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#8ba0b699" }}>
            Código: {error.digest}
          </p>
        )}
      </body>
    </html>
  );
}
