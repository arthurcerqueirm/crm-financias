// Resolvedor de módulo para os testes: traduz os imports "@/..." usados em
// todo o app (via tsconfig paths, resolvidos pelo bundler do Next.js) para
// caminhos que o `node --test` sozinho consegue abrir. O Next nunca vê este
// arquivo — ele só existe para rodar `npm test` fora do Next.
import { pathToFileURL } from "node:url";

const raiz = pathToFileURL(`${process.cwd()}/`);

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const alvo = new URL(`${specifier.slice(2)}.ts`, raiz).href;
    return nextResolve(alvo, context);
  }
  return nextResolve(specifier, context);
}
