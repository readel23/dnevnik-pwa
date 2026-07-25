-- Run this file once in Supabase SQL Editor.
-- It creates public profiles, guarantees a unique nickname and connects it to Auth.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-z0-9_]{3,24}$')
);

create unique index if not exists profiles_username_unique
  on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

grant select, update on public.profiles to authenticated;

create or replace function public.is_username_available(candidate_username text)
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select not exists (
    select 1
    from public.profiles
    where lower(username) = lower(trim(candidate_username))
  );
$$;

revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    lower(trim(new.raw_user_meta_data ->> 'username')),
    trim(new.raw_user_meta_data ->> 'full_name')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- One versioned document per user keeps notes, projects and preferences
-- available offline and synchronized across every signed-in device.
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "Users read their own app state" on public.user_app_state;
create policy "Users read their own app state"
  on public.user_app_state for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own app state" on public.user_app_state;
create policy "Users create their own app state"
  on public.user_app_state for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own app state" on public.user_app_state;
create policy "Users update their own app state"
  on public.user_app_state for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own app state" on public.user_app_state;
create policy "Users delete their own app state"
  on public.user_app_state for delete
  to authenticated
  using ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.user_app_state to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_app_state'
  ) then
    alter publication supabase_realtime add table public.user_app_state;
  end if;
end
$$;
