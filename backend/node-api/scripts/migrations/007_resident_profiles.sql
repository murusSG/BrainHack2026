-- Run this in your Supabase SQL editor after 006_profiles_signup_fields.sql.
-- Stores resident-specific personalization used by the resident alert page and Ask MURUS.

create table if not exists resident_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  home_address text,
  preferred_transport text not null default 'walking',
  mobility_need text not null default 'none',
  support_notes text,
  emergency_contact_name text,
  emergency_contact_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists resident_saved_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  address text,
  lat double precision,
  lng double precision,
  place_type text not null default 'other',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_resident_saved_places_user_id
  on resident_saved_places(user_id);

create or replace function set_resident_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists resident_profiles_set_updated_at on resident_profiles;
create trigger resident_profiles_set_updated_at
before update on resident_profiles
for each row execute function set_resident_profile_updated_at();

drop trigger if exists resident_saved_places_set_updated_at on resident_saved_places;
create trigger resident_saved_places_set_updated_at
before update on resident_saved_places
for each row execute function set_resident_profile_updated_at();
