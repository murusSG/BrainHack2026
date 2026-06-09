create extension if not exists pgcrypto;

create table if not exists incidents (
  id                         text primary key,
  title                      text not null,
  category                   text,
  description                text,
  status                     text not null
    check (status in ('pending_approval', 'dispatched', 'declined', 'closed')),
  severity                   text,
  priority_score             integer,
  priority_reason            text,
  location_name              text,
  latitude                   numeric,
  longitude                  numeric,
  marker_status              text not null default 'pending'
    check (marker_status in ('pending', 'approved', 'declined', 'closed')),
  recommended_agencies       jsonb not null default '[]'::jsonb,
  recommended_resources      jsonb not null default '[]'::jsonb,
  cluster_id                 text,
  created_from_report_id     uuid,
  resource_allocation_status text not null
    check (resource_allocation_status in ('pending_dispatcher_approval', 'needs_manual_review', 'approved', 'declined')),
  canonical_event            jsonb not null,
  extracted_incident         jsonb not null,
  recommendations            jsonb not null,
  approved_agencies          text[] not null default '{}',
  approved_by                text,
  approved_at                timestamptz,
  dispatch_decision          jsonb,
  created_at                 timestamptz not null default now(),
  updated_at                 timestamptz not null default now()
);

create table if not exists public_incident_reports (
  id            uuid primary key default gen_random_uuid(),
  report_id     text not null unique,
  source        text not null default 'public',
  title         text,
  category      text,
  report_text   text not null,
  location_name text,
  latitude      numeric,
  longitude     numeric,
  media_urls    jsonb not null default '[]'::jsonb,
  incident_id   text references incidents(id) on delete set null,
  status        text not null default 'received'
    check (status in ('received', 'pending_approval', 'needs_manual_review', 'grouped_with_existing_incident', 'dispatched', 'declined')),
  reported_at   timestamptz not null,
  created_at    timestamptz not null default now()
);

create index if not exists incidents_status_idx on incidents (status);
create index if not exists incidents_priority_score_idx on incidents (priority_score desc);
create index if not exists incidents_created_at_idx on incidents (created_at desc);
create index if not exists incidents_lat_lng_idx on incidents (latitude, longitude);
create index if not exists public_incident_reports_incident_id_idx on public_incident_reports (incident_id);
create index if not exists public_incident_reports_created_at_idx on public_incident_reports (created_at desc);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists incidents_updated_at on incidents;
create trigger incidents_updated_at
  before update on incidents
  for each row execute procedure set_updated_at();

alter table incidents enable row level security;
alter table public_incident_reports enable row level security;

create policy "authenticated read incidents"
  on incidents for select
  using (auth.role() = 'authenticated');

create policy "service role mutate incidents"
  on incidents for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create policy "authenticated read public incident reports"
  on public_incident_reports for select
  using (auth.role() = 'authenticated');

create policy "service role mutate public incident reports"
  on public_incident_reports for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
