"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type OpcoesExclusao<T> = {
  mensagem: string;
  // PromiseLike, não Promise: o builder do supabase-js só é "then-ável", não
  // uma Promise completa — await funciona nos dois, então isto evita ter
  // que dar .then()/encadear em cada chamador só para bater o tipo.
  aoExcluirDeVerdade: () => PromiseLike<{ error: { message: string } | null }>;
  aoErro?: (mensagem: string) => void;
  /** Tempo até a exclusão virar definitiva no banco, em ms. */
  atrasoMs?: number;
  /** Reordena a lista depois de um item voltar (desfazer ou falha ao excluir). */
  comparador?: (a: T, b: T) => number;
};

/**
 * Lista local com exclusão adiada: o item some da tela na hora, mas só é
 * apagado do banco alguns segundos depois — tempo suficiente para o botão
 * "Desfazer" do toast cancelar a exclusão sem precisar de nenhuma chamada ao
 * servidor. Substitui o confirm() nativo antes de excluir: a rede de
 * segurança passa a ser desfazer depois, não confirmar antes.
 */
export function useListaComDesfazer<T extends { id: string }>(inicial: T[]) {
  const [itens, setItens] = useState<T[]>(inicial);
  useEffect(() => setItens(inicial), [inicial]);

  const { notificar } = useToast();
  const pendentes = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  function excluir(item: T, opcoes: OpcoesExclusao<T>) {
    const { mensagem, aoExcluirDeVerdade, aoErro, atrasoMs = 5000, comparador } = opcoes;

    setItens((atual) => atual.filter((x) => x.id !== item.id));

    function restaurar() {
      setItens((atual) => {
        const novo = [item, ...atual.filter((x) => x.id !== item.id)];
        return comparador ? novo.sort(comparador) : novo;
      });
    }

    const temporizador = setTimeout(async () => {
      pendentes.current.delete(item.id);
      const { error } = await aoExcluirDeVerdade();
      if (error) {
        aoErro?.(error.message);
        restaurar();
      }
    }, atrasoMs);
    pendentes.current.set(item.id, temporizador);

    notificar({
      mensagem,
      acaoLabel: "Desfazer",
      duracaoMs: atrasoMs,
      aoAcao: () => {
        const t = pendentes.current.get(item.id);
        if (t) {
          clearTimeout(t);
          pendentes.current.delete(item.id);
        }
        restaurar();
      },
    });
  }

  return { itens, setItens, excluir };
}
