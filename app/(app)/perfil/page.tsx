import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import GerenciadorConta from "@/components/GerenciadorConta";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Perfil · Minhas Finanças" };

export default async function PaginaPerfil() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <>
      <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Perfil</h1>
      <p className="mt-1 text-sm text-[var(--color-suave)]">
        Sua conta, senha e o botão para apagar tudo, se um dia quiser.
      </p>

      <div className="mt-5">
        <GerenciadorConta email={user.email ?? ""} />
      </div>
    </>
  );
}
