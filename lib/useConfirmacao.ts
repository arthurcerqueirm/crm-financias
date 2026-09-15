"use client";

import { useCallback, useState } from "react";

/**
 * Confirmação assíncrona baseada em Promise, para trocar o `confirm()`
 * nativo por um <ConfirmDialog> estilizado sem duplicar o estado de "qual
 * item está pendente de confirmação" em cada componente que exclui algo.
 *
 * Uso:
 *   const confirmacao = useConfirmacao<Conta>();
 *   const ok = await confirmacao.pedir(conta);
 *   if (!ok) return;
 *   ...
 *   {confirmacao.alvo && <ConfirmDialog ... aoConfirmar={confirmacao.confirmar} aoCancelar={confirmacao.cancelar} />}
 */
export function useConfirmacao<T>() {
  const [alvo, setAlvo] = useState<T | null>(null);
  const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

  const pedir = useCallback((item: T) => {
    return new Promise<boolean>((resolve) => {
      setAlvo(item);
      setResolver(() => resolve);
    });
  }, []);

  const responder = useCallback(
    (v: boolean) => {
      resolver?.(v);
      setAlvo(null);
      setResolver(null);
    },
    [resolver],
  );

  return {
    alvo,
    pedir,
    confirmar: () => responder(true),
    cancelar: () => responder(false),
  };
}
