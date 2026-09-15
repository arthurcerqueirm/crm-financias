import { redirect } from "next/navigation";
import Navegacao from "@/components/Navegacao";
import ConfiguracaoPendente from "@/components/ConfiguracaoPendente";
import ToastProvider from "@/components/ToastProvider";
import { supabaseConfigurado } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";

export default async function LayoutApp({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!supabaseConfigurado()) {
    return <ConfiguracaoPendente />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <ToastProvider>
      <div className="relative z-10">
        <Navegacao email={user.email ?? ""} />
        <main className="px-4 pb-24 pt-4 sm:px-6 lg:ml-60 lg:px-8 lg:pb-10 lg:pt-8">
          {children}
        </main>
      </div>
    </ToastProvider>
  );
}
