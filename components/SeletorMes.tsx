"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { mesLongo, mesAnterior } from "@/lib/formato";

function mesSeguinte(anoMes: string): string {
  const [ano, mes] = anoMes.split("-").map(Number);
  const d = new Date(ano, mes, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function SeletorMes({
  mes,
  maximo,
}: {
  mes: string;
  maximo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ir(novoMes: string) {
    const novos = new URLSearchParams(params.toString());
    novos.set("mes", novoMes);
    // replace, não push: cada troca de mês não deveria virar uma entrada no
    // histórico — clicar "‹" oito vezes e depois "voltar" no celular
    // rebobinava mês por mês em vez de sair da tela.
    router.replace(`${pathname}?${novos.toString()}`);
  }

  const podeAvancar = mes < maximo;

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => ir(mesAnterior(mes))}
        aria-label="Mês anterior"
        className="rounded-lg border border-[var(--color-borda)] px-2.5 py-1.5 text-sm text-[var(--color-suave)] transition hover:text-[var(--color-texto)]"
      >
        ‹
      </button>
      <span className="min-w-[9.5rem] text-center text-sm font-semibold">
        {mesLongo(mes)}
      </span>
      <button
        onClick={() => podeAvancar && ir(mesSeguinte(mes))}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
        className="rounded-lg border border-[var(--color-borda)] px-2.5 py-1.5 text-sm text-[var(--color-suave)] transition hover:text-[var(--color-texto)] disabled:opacity-30"
      >
        ›
      </button>
      {mes !== maximo && (
        <button
          onClick={() => ir(maximo)}
          className="ml-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--color-verde)] transition hover:underline"
        >
          hoje
        </button>
      )}
    </div>
  );
}
