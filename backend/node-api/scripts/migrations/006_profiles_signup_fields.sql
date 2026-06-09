-- Run this in your Supabase SQL editor after 003_profiles_roles.sql.
-- Adds public-signup fields and copies them from auth signup metadata.

alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists phone text;

-- Replace the existing handle_new_user() so it also copies full_name / phone
-- from the signup metadata (works for both email/password and Google signups;
-- phone will be null for Google unless collected later).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, phone)
  values (
    new.id,
    'public',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Trigger on_auth_user_created already exists from 003; recreating the function
-- above is sufficient. No trigger change required.
