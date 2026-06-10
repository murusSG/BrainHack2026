-- Run this in Supabase after 007_resident_profiles.sql.
-- Adds a stored resident persona so Ask MURUS can infer profile context from login data.

alter table resident_profiles
  add column if not exists resident_persona text not null default 'general';

alter table resident_profiles
  drop constraint if exists resident_profiles_persona_check;

alter table resident_profiles
  add constraint resident_profiles_persona_check
  check (resident_persona in ('general', 'elderly', 'parent', 'driver', 'tourist', 'mobility'));
