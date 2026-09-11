-- ============================================================
-- CRM de Finanças Pessoais — Schema Supabase
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- É idempotente: pode rodar de novo sem quebrar nada.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- CATEGORIAS
-- ------------------------------------------------------------
create table if not exists public.categorias (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  nome             text not null,
  tipo             text not null default 'despesa' check (tipo in ('despesa', 'receita')),
  cor              text not null default '#64748b',
  icone            text not null default '📦',
  palavras_chave   text[] not null default '{}',
  orcamento_mensal numeric(14,2),
  created_at       timestamptz not null default now(),
  unique (user_id, nome)
);

-- ------------------------------------------------------------
-- CONTAS (banco, cartão, carteira, investimento)
-- ------------------------------------------------------------
create table if not exists public.contas (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  nome               text not null,
  tipo               text not null default 'corrente'
                     check (tipo in ('corrente','poupanca','investimento','cartao','dinheiro','outro')),
  instituicao        text,
  saldo_inicial      numeric(14,2) not null default 0,
  incluir_patrimonio boolean not null default true,
  ativa              boolean not null default true,
  created_at         timestamptz not null default now(),
  unique (user_id, nome)
);

-- ------------------------------------------------------------
-- IMPORTAÇÕES (cada upload de extrato)
-- ------------------------------------------------------------
create table if not exists public.importacoes (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  arquivo_nome    text not null,
  conta_id        uuid references public.contas(id) on delete set null,
  total_linhas    integer not null default 0,
  total_importado integer not null default 0,
  total_duplicado integer not null default 0,
  created_at      timestamptz not null default now()
);

-- ------------------------------------------------------------
-- TRANSAÇÕES
-- valor é sempre POSITIVO; a direção vem de `tipo`.
-- ------------------------------------------------------------
create table if not exists public.transacoes (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  conta_id           uuid references public.contas(id) on delete set null,
  categoria_id       uuid references public.categorias(id) on delete set null,
  importacao_id      uuid references public.importacoes(id) on delete set null,
  data               date not null,
  descricao          text not null,
  descricao_original text,
  valor              numeric(14,2) not null check (valor >= 0),
  tipo               text not null check (tipo in ('receita','despesa','transferencia')),
  observacao         text,
  origem             text not null default 'manual' check (origem in ('manual','importacao')),
  categorizado_por   text not null default 'manual' check (categorizado_por in ('manual','regra','ia')),
  hash_dedup         text,
  created_at         timestamptz not null default now()
);

-- Evita importar a mesma linha do extrato duas vezes.
-- Índice completo (sem WHERE) de propósito: o ON CONFLICT do upsert só consegue
-- inferir um índice não-parcial. Lançamentos manuais têm hash nulo, e no Postgres
-- valores nulos nunca conflitam entre si.
create unique index if not exists transacoes_dedup_idx
  on public.transacoes (user_id, hash_dedup);

create index if not exists transacoes_user_data_idx on public.transacoes (user_id, data desc);
create index if not exists transacoes_categoria_idx on public.transacoes (user_id, categoria_id);

-- ------------------------------------------------------------
-- PATRIMÔNIO (fotos do saldo/valor de cada ativo ao longo do tempo)
-- ------------------------------------------------------------
create table if not exists public.patrimonio (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  conta_id   uuid references public.contas(id) on delete set null,
  nome       text not null,
  tipo       text not null default 'ativo' check (tipo in ('ativo','passivo')),
  data       date not null,
  valor      numeric(14,2) not null,
  created_at timestamptz not null default now(),
  unique (user_id, nome, data)
);

create index if not exists patrimonio_user_data_idx on public.patrimonio (user_id, data);

-- ------------------------------------------------------------
-- INSIGHTS DE IA
-- ------------------------------------------------------------
create table if not exists public.insights (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  periodo_inicio  date not null,
  periodo_fim     date not null,
  resumo          text not null,
  dados           jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists insights_user_idx on public.insights (user_id, created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY — cada usuário só enxerga os próprios dados
-- ============================================================
alter table public.categorias   enable row level security;
alter table public.contas       enable row level security;
alter table public.importacoes  enable row level security;
alter table public.transacoes   enable row level security;
alter table public.patrimonio   enable row level security;
alter table public.insights     enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['categorias','contas','importacoes','transacoes','patrimonio','insights']
  loop
    execute format('drop policy if exists "%1$s_proprio" on public.%1$I', t);
    execute format(
      'create policy "%1$s_proprio" on public.%1$I
         for all to authenticated
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- ============================================================
-- CATEGORIAS PADRÃO PARA NOVOS USUÁRIOS
-- ============================================================
create or replace function public.criar_categorias_padrao()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.categorias (user_id, nome, tipo, cor, icone, palavras_chave) values
    (new.id, 'Alimentação',   'despesa', '#ef4444', '🍽️', array['ifood','restaurante','lanchonete','padaria','pizza','burger','mc donalds','subway','cafe','bar ','delivery','rappi']),
    (new.id, 'Mercado',       'despesa', '#f97316', '🛒', array['supermercado','mercado','atacad','carrefour','assai','extra','pao de acucar','hortifruti','sacolao']),
    (new.id, 'Transporte',    'despesa', '#eab308', '🚗', array['uber','99','taxi','combustivel','posto','gasolina','estacionamento','pedagio','metro','onibus','bilhete unico','ipva']),
    (new.id, 'Moradia',       'despesa', '#84cc16', '🏠', array['aluguel','condominio','luz','energia','agua','gas','internet','iptu','enel','sabesp','vivo fibra']),
    (new.id, 'Saúde',         'despesa', '#22c55e', '💊', array['farmacia','drogaria','medico','hospital','plano de saude','unimed','dentista','exame','laboratorio']),
    (new.id, 'Lazer',         'despesa', '#14b8a6', '🎬', array['netflix','spotify','cinema','show','ingresso','steam','playstation','xbox','disney','hbo','prime video']),
    (new.id, 'Compras',       'despesa', '#06b6d4', '🛍️', array['shopee','mercado livre','amazon','magazine','americanas','shein','aliexpress','loja','renner','zara']),
    (new.id, 'Educação',      'despesa', '#3b82f6', '📚', array['curso','faculdade','escola','udemy','alura','livro','mensalidade']),
    (new.id, 'Assinaturas',   'despesa', '#6366f1', '🔁', array['assinatura','mensal','icloud','google one','chatgpt','claude','adobe','microsoft']),
    (new.id, 'Taxas e Juros', 'despesa', '#8b5cf6', '🏦', array['tarifa','juros','anuidade','iof','multa','encargo']),
    (new.id, 'Impostos',      'despesa', '#a855f7', '🧾', array['imposto','darf','inss','irpf','das ']),
    (new.id, 'Investimentos', 'despesa', '#d946ef', '📈', array['aplicacao','tesouro','cdb','corretora','xp investimentos','nuinvest','rico','clear']),
    (new.id, 'Pets',          'despesa', '#ec4899', '🐾', array['petshop','veterinario','racao','pet ']),
    (new.id, 'Outros',        'despesa', '#64748b', '📦', array[]::text[]),
    (new.id, 'Salário',       'receita', '#16a34a', '💰', array['salario','pagamento','folha','remuneracao','proventos']),
    (new.id, 'Freelance',     'receita', '#059669', '💼', array['freela','servico prestado','nota fiscal','pj ']),
    (new.id, 'Rendimentos',   'receita', '#0d9488', '📊', array['rendimento','dividendo','juros recebidos','resgate','cashback']),
    (new.id, 'Outras Receitas','receita','#0891b2', '➕', array[]::text[])
  on conflict (user_id, nome) do nothing;

  insert into public.contas (user_id, nome, tipo, instituicao)
  values (new.id, 'Conta Principal', 'corrente', null)
  on conflict (user_id, nome) do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_categorias_padrao();
