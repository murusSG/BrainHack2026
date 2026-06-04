-- Durable command-state tables for Foresight-generated dispatcher recommendations.
-- Run this in the Supabase SQL editor after 001_create_tables.sql.

create table if not exists command_allocations (
  id                text primary key,
  incident_id       text not null,
  incident_title    text not null,
  severity          text not null,
  confidence        integer not null default 0,
  generated_at      text not null,
  generated_from    text,
  linked_prediction text,
  model_version     text not null,
  trigger_signals   jsonb not null default '[]'::jsonb,
  draft_message     text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists command_allocation_agencies (
  row_id            uuid primary key default uuid_generate_v4(),
  allocation_id     text not null references command_allocations(id) on delete cascade,
  agency_id         text not null,
  agency            text not null,
  channel           text not null,
  confidence        integer not null default 0,
  reason            text not null,
  suggested_action  text not null,
  status            text not null default 'pending_approval',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (allocation_id, agency_id)
);

create table if not exists command_timeline_entries (
  id                text primary key,
  time_label        text not null,
  title             text not null,
  detail            text not null,
  location          text not null,
  severity          text not null,
  source            text not null default 'command',
  recommendation_id text references command_allocations(id) on delete set null,
  created_at        timestamptz not null default now()
);

create index if not exists idx_command_allocations_created_at
  on command_allocations (created_at desc);

create index if not exists idx_command_allocation_agencies_allocation_id
  on command_allocation_agencies (allocation_id);

create index if not exists idx_command_timeline_created_at
  on command_timeline_entries (created_at desc);

create index if not exists idx_command_timeline_recommendation_id
  on command_timeline_entries (recommendation_id);
