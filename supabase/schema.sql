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

-- ============================================================
-- USO DE IA — limite diário por usuário
-- ============================================================
-- Sem isso, qualquer conta criada (o cadastro é aberto por padrão no
-- Supabase) pode chamar as rotas de IA sem limite e gastar a chave da
-- Anthropic configurada no projeto. O contador é por linha (user_id, dia) e
-- o incremento é atômico via a função abaixo — não dá para burlar com
-- requisições em paralelo.
create table if not exists public.uso_ia (
  user_id             uuid not null references auth.users(id) on delete cascade,
  dia                 date not null default (current_date),
  analises             integer not null default 0,
  itens_categorizados integer not null default 0,
  paginas_pdf_lidas   integer not null default 0,
  primary key (user_id, dia)
);

alter table public.uso_ia enable row level security;

drop policy if exists "uso_ia_proprio" on public.uso_ia;
create policy "uso_ia_proprio" on public.uso_ia
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- SECURITY DEFINER: incrementa e devolve o total do dia numa única operação
-- atômica, para duas requisições simultâneas não conseguirem passar do limite.
create or replace function public.registrar_uso_ia(
  p_analises integer default 0,
  p_itens integer default 0,
  p_pdf integer default 0
)
returns table (analises integer, itens_categorizados integer, paginas_pdf_lidas integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  insert into public.uso_ia (user_id, dia, analises, itens_categorizados, paginas_pdf_lidas)
  values (v_user, current_date, p_analises, p_itens, p_pdf)
  on conflict (user_id, dia) do update
    set analises = public.uso_ia.analises + excluded.analises,
        itens_categorizados = public.uso_ia.itens_categorizados + excluded.itens_categorizados,
        paginas_pdf_lidas = public.uso_ia.paginas_pdf_lidas + excluded.paginas_pdf_lidas
  returning public.uso_ia.analises, public.uso_ia.itens_categorizados, public.uso_ia.paginas_pdf_lidas
  into analises, itens_categorizados, paginas_pdf_lidas;

  return next;
end;
$$;

grant execute on function public.registrar_uso_ia(integer, integer, integer) to authenticated;

-- ============================================================
-- AJUSTES DE INTEGRIDADE (patrimônio)
-- ============================================================
-- transacoes.valor já tinha check (valor >= 0); patrimonio.valor não tinha
-- o mesmo cuidado — nada impedia gravar um saldo negativo por engano
-- (dívidas usam tipo='passivo' com valor positivo, não valor negativo).
-- Corrige qualquer valor negativo existente antes de travar a constraint,
-- pelo mesmo motivo da limpeza de insights acima: a migração precisa rodar
-- limpo mesmo num banco que já tem dados.
update public.patrimonio set valor = abs(valor) where valor < 0;

do $$
begin
  alter table public.patrimonio
    add constraint patrimonio_valor_nao_negativo check (valor >= 0);
exception
  when duplicate_object then null;
end $$;

-- Índice que faltava para o padrão de consulta mais comum da tela de
-- Patrimônio: buscar o histórico de um ativo específico do usuário.
create index if not exists patrimonio_user_nome_idx on public.patrimonio (user_id, nome);

-- ============================================================
-- AJUSTES DE INTEGRIDADE (insights e transferências)
-- ============================================================
-- Só o insight mais recente de cada mês é lido (ver app/api/analise);
-- sem essa restrição, clicar em "Analisar de novo" empilhava um registro
-- novo por clique, e os antigos ficavam mortos na tabela para sempre.
--
-- Quem já usou "Analisar de novo" antes desta migração pode ter mais de
-- um insight para o mesmo mês — a limpeza abaixo roda sempre (é barata e
-- idempotente) e garante que a constraint consiga ser criada mesmo num
-- banco que já tem dados.
delete from public.insights a
using public.insights b
where a.user_id = b.user_id
  and a.periodo_inicio = b.periodo_inicio
  and (a.created_at, a.id) < (b.created_at, b.id);

do $$
begin
  alter table public.insights
    add constraint insights_um_por_periodo unique (user_id, periodo_inicio);
exception
  when duplicate_object then null;
end $$;

-- Uma transferência move dinheiro de uma conta para outra; conta_id sozinho
-- só registrava um dos dois lados. Nome explícito na FK para o PostgREST
-- conseguir distinguir esta relação da de conta_id ao montar o join.
alter table public.transacoes
  add column if not exists conta_destino_id uuid
  constraint transacoes_conta_destino_id_fkey references public.contas(id) on delete set null;
