-- Run this in your Supabase SQL editor after 002_command_state.sql.
-- Adds role-based access for the three murusSG personas: public / responder / leader.

-- One profile row per auth user, holding their persona role and (for responders) agency.
create table if not exists profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        text not null default 'public' check (role in ('public', 'responder', 'leader')),
  agency      text,
  created_at  timestamptz not null default now()
);

alter table profiles enable row level security;

-- A user may read and update only their own profile. Role escalation is intentionally
-- NOT permitted from the client; an admin/service-role sets roles (see below).
drop policy if exists "profiles_self_select" on profiles;
create policy "profiles_self_select" on profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_self_update" on profiles;
create policy "profiles_self_update" on profiles
  for update using (auth.uid() = id) with check (auth.uid() = id and role = (select role from profiles where id = auth.uid()));

-- Create a profile automatically when a new auth user signs up.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'public')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Mirror the role into the JWT's app_metadata so the Node API can authorise
-- statelessly from the token. Run this after changing a user's role, e.g.:
--
--   update public.profiles set role = 'leader' where id = '<user-uuid>';
--   -- then, with the service role (e.g. via supabase-js admin):
--   -- supabase.auth.admin.updateUserById(userId, { app_metadata: { role: 'leader' } })
--
-- For the hackathon you can set both in the SQL editor / dashboard.
