-- In4rtech website schema for Supabase (Postgres).
-- Run once in the Supabase SQL Editor. Safe to re-run.
--
-- Only the website's server talks to these tables, using the service-role key.
-- Row level security is enabled with no policies, so the public anon key
-- cannot read or change anything.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text,
  email text not null,
  phone text,
  company text,
  subject text not null,
  service text,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists contacts_created_at_idx on public.contacts (created_at desc);

create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  author text not null default '',
  content text not null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists blog_posts_status_published_idx on public.blog_posts (status, published_at desc);

create table if not exists public.admin_sessions (
  id text primary key,
  session jsonb not null,
  expires_at timestamptz not null
);
create index if not exists admin_sessions_expires_at_idx on public.admin_sessions (expires_at);

create table if not exists public.request_limits (
  key text primary key,
  scope text not null,
  count integer not null,
  reset_at timestamptz not null
);

alter table public.contacts enable row level security;
alter table public.blog_posts enable row level security;
alter table public.admin_sessions enable row level security;
alter table public.request_limits enable row level security;

-- Counts one request and returns true while the caller is within the limit.
-- A single upsert keeps the count correct across concurrent serverless instances.
create or replace function public.consume_rate_limit(p_key text, p_scope text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  -- Opportunistic cleanup of expired rows.
  delete from request_limits where reset_at < now() - interval '1 day';
  delete from admin_sessions where expires_at < now();

  insert into request_limits as r (key, scope, count, reset_at)
  values (p_key, p_scope, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning count into v_count;
  return v_count <= p_limit;
end;
$$;

revoke execute on function public.consume_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, text, integer, integer) to service_role;
