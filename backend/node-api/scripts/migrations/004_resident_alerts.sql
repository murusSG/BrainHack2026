-- Durable resident alert broadcasts for the citizen alert channel.
-- Run this in Supabase after 002_command_state.sql if command-published
-- resident alerts should survive backend restarts.

create table if not exists resident_alerts (
  id               text primary key,
  source_type      text not null default 'command_broadcast',
  title            text not null,
  body             text not null,
  public_action    text not null,
  severity         text not null,
  location_label   text not null,
  lat              double precision,
  lng              double precision,
  radius_meters    integer not null default 5000,
  related_event_id text,
  issued_at        timestamptz not null default now(),
  expires_at       timestamptz,
  status           text not null default 'active',
  channels         jsonb not null default '["in_app", "web"]'::jsonb,
  audience         jsonb not null default '{"type": "all"}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists idx_resident_alerts_status_issued_at
  on resident_alerts (status, issued_at desc);

create index if not exists idx_resident_alerts_expires_at
  on resident_alerts (expires_at);
