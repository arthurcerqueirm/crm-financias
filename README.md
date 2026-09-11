# Minhas Finanças

CRM pessoal de finanças: importa o extrato do banco, categoriza os gastos
sozinho, mostra para onde o dinheiro está indo e acompanha a evolução do
patrimônio. Feito para rodar na Vercel com banco no Supabase.

## O que tem

- **Painel** — receitas, despesas, quanto sobrou e patrimônio líquido do mês,
  com comparação automática contra o mês anterior.
- **Gráficos** — receitas x despesas em 12 meses, rosca de gastos por categoria,
  evolução do patrimônio, quanto sobra por mês e tendência da maior categoria.
- **Importação de extrato** — arrasta um CSV ou OFX e pronto. Entende os
  formatos de Nubank, Itaú, Bradesco, BB, Inter, C6 e Santander (separador,
  cabeçalho e codificação são detectados automaticamente), e não importa a
  mesma transação duas vezes.
- **Categorização automática** — primeiro por palavras-chave (de graça e
  instantâneo); o que sobrar vai para a IA, que também limpa a descrição
  (`PAG*IFD1234 SAO PAULO` vira `iFood`).
- **Análise com IA** — resumo do mês, alertas de gastos fora do padrão e
  sugestões de economia com valor estimado.
- **Patrimônio** — registro mensal de contas, investimentos e dívidas.
- **Categorias e orçamentos** — cor, ícone, palavras-chave e teto mensal.

Tudo responsivo: barra lateral no computador, navegação inferior no celular.

## Como colocar no ar

### 1. Banco de dados (Supabase)

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql)
   e execute. Isso cria as tabelas, liga o RLS (cada usuário só vê os próprios
   dados) e deixa 18 categorias brasileiras prontas para quem se cadastrar.
3. Em **Project Settings → API**, copie a **Project URL** e a chave
   **anon public**.

> Se você preferir que ninguém mais consiga criar conta no seu app, vá em
> **Authentication → Providers → Email** e desligue *Enable signups* depois de
> criar a sua.

### 2. Deploy (Vercel)

1. Importe este repositório na [Vercel](https://vercel.com/new).
2. Em **Settings → Environment Variables**, adicione:

   | Variável | Valor |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | a Project URL do Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | a chave anon public |
   | `ANTHROPIC_API_KEY` | sua chave do [console.anthropic.com](https://console.anthropic.com) (opcional) |

3. Faça o deploy e acesse a URL. Crie sua conta na tela de login.

Sem `ANTHROPIC_API_KEY` o app funciona normalmente — só a categorização por IA
e a página de análise ficam indisponíveis; a categorização por palavras-chave
continua valendo.

### 3. Rodando local

```bash
npm install
cp .env.example .env.local   # preencha as variáveis
npm run dev
```

## Como usar

1. **Importe um extrato.** No seu banco, exporte o extrato em CSV ou OFX
   (no Nubank: *Conta → Extrato → exportar*). Solte o arquivo em **Importar**.
2. **Revise a prévia.** Dá para trocar a categoria de qualquer linha e
   desmarcar o que não quiser antes de confirmar. O que já foi importado antes
   vem marcado e bloqueado.
3. **Ajuste as palavras-chave.** Em **Categorias**, adicione os termos que
   aparecem no seu extrato. Na próxima importação eles são reconhecidos sozinhos,
   sem custo de IA.
4. **Registre o patrimônio.** Uma vez por mês, anote em **Patrimônio** o saldo de
   cada conta, investimento e dívida. Use sempre o mesmo nome para o gráfico
   ligar os pontos.
5. **Peça a análise.** Em **Análise IA**, escolha o mês e clique em analisar.

## Estrutura

```
app/
  (app)/            painel, transações, importar, patrimônio, análise, categorias
  api/
    analise/        gera os insights do mês com IA
    importar/       analisar (lê e categoriza) e salvar (grava no banco)
  login/
components/         gráficos, formulários e navegação
lib/
  extrato.ts        leitura de CSV/OFX, datas e valores em formato brasileiro
  categorizar.ts    categorização por palavra-chave
  ia.ts             chamadas ao Claude (categorização e análise)
  agregacoes.ts     somas por mês, por categoria e evolução do patrimônio
  formato.ts        moeda e datas em pt-BR
  supabase/         clientes de browser, servidor e middleware de sessão
supabase/schema.sql tabelas, índices, RLS e categorias padrão
```

## Segurança

- Todas as tabelas usam Row Level Security: mesmo com a chave anon em mãos,
  ninguém lê os dados de outra conta.
- A chave anon do Supabase é pública por natureza (vai no navegador) — quem
  protege os dados é o RLS, por isso não remova as políticas do schema.
- A `ANTHROPIC_API_KEY` só é usada no servidor e nunca chega ao navegador.
- Nunca comite `.env.local` nem a senha do banco; o `.gitignore` já cobre isso.
