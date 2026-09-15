"use client";

import Modal from "@/components/Modal";

/**
 * Confirmação estilizada e acessível, no lugar do confirm() nativo do
 * navegador — que sai do tema, trava a aba e é bloqueado por alguns
 * navegadores in-app (Instagram, TikTok) sem dar retorno nenhum ao usuário.
 */
export default function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  rotuloConfirmar = "Confirmar",
  perigo = true,
  aoConfirmar,
  aoCancelar,
}: {
  aberto: boolean;
  titulo: string;
  mensagem: string;
  rotuloConfirmar?: string;
  perigo?: boolean;
  aoConfirmar: () => void;
  aoCancelar: () => void;
}) {
  return (
    <Modal
      aberto={aberto}
      aoFechar={aoCancelar}
      labelledBy="confirm-dialog-titulo"
      className="w-full max-w-sm space-y-4 rounded-2xl border border-[var(--color-borda)] bg-[var(--color-painel)] p-5"
    >
      <h2 id="confirm-dialog-titulo" className="text-lg font-bold">
        {titulo}
      </h2>
      <p className="text-sm leading-relaxed text-[var(--color-suave)]">{mensagem}</p>
      <div className="flex gap-2">
        <button type="button" onClick={aoCancelar} className="botao-secundario flex-1">
          Cancelar
        </button>
        <button
          type="button"
          onClick={aoConfirmar}
          className={`flex-1 ${perigo ? "botao-perigo" : "botao"}`}
        >
          {rotuloConfirmar}
        </button>
      </div>
    </Modal>
  );
}
