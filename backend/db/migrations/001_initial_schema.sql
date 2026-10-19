-- Initial In4rtech schema: contact enquiries, blog posts, admin sessions and request limits.
-- Applied automatically on first database use; see backend/db/migrate.js.

create table if not exists contacts (
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
create index if not exists contacts_created_at_idx on contacts (created_at desc);

create table if not exists blog_posts (
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
create index if not exists blog_posts_status_published_idx on blog_posts (status, published_at desc);

create table if not exists admin_sessions (
  id text primary key,
  session jsonb not null,
  expires_at timestamptz not null
);
create index if not exists admin_sessions_expires_at_idx on admin_sessions (expires_at);

create table if not exists request_limits (
  key text primary key,
  scope text not null,
  count integer not null,
  reset_at timestamptz not null
);

-- Counts one request and returns true while the caller is within the limit.
-- A single upsert keeps the count correct across concurrent server instances.
create or replace function consume_rate_limit(p_key text, p_scope text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
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
