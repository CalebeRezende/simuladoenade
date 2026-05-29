-- SUPABASE SQL — Simulado ENADE/PND Pedagogia
-- Rode este arquivo no SQL Editor do Supabase.

create extension if not exists pgcrypto;

create table if not exists public.attempts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  nome text not null,
  email text,

  prova_codigo text not null,
  prova_label text,
  gabarito_codigo text not null,
  gabarito_label text,

  respostas jsonb not null default '{}'::jsonb,
  correcao jsonb not null default '[]'::jsonb,

  acertos integer not null,
  erros integer not null,
  em_branco integer not null,
  anuladas integer not null default 0,
  total_questoes integer not null default 80,
  nota_texto text not null,
  percentual numeric(5,2) not null,

  iniciado_em timestamptz not null,
  enviado_em timestamptz not null,
  duracao_segundos integer,

  user_agent text
);

alter table public.attempts enable row level security;

-- Alunos/participantes podem inserir tentativas sem login.
drop policy if exists "Participantes podem inserir tentativas" on public.attempts;
create policy "Participantes podem inserir tentativas"
on public.attempts
for insert
to anon, authenticated
with check (true);

-- Admins autenticados podem ler o painel.
-- IMPORTANTE: crie somente seu usuário admin em Authentication > Users
-- e desative public signups em Authentication > Providers > Email.
drop policy if exists "Admins autenticados podem ler tentativas" on public.attempts;
create policy "Admins autenticados podem ler tentativas"
on public.attempts
for select
to authenticated
using (true);

-- Opcional: se quiser restringir o admin a e-mails específicos,
-- substitua a política de SELECT acima por esta versão:
--
-- drop policy if exists "Admins autenticados podem ler tentativas" on public.attempts;
-- create policy "Admins autenticados podem ler tentativas"
-- on public.attempts
-- for select
-- to authenticated
-- using (
--   (auth.jwt() ->> 'email') in (
--     'SEU_EMAIL_AQUI@EXEMPLO.COM'
--   )
-- );

create index if not exists attempts_enviado_em_idx on public.attempts (enviado_em desc);
create index if not exists attempts_nome_idx on public.attempts (nome);
create index if not exists attempts_prova_idx on public.attempts (prova_codigo, gabarito_codigo);
