-- responder_incident_logs: shared operational timeline entries for dispatched incidents
create table if not exists responder_incident_logs (
  id          uuid        primary key default gen_random_uuid(),
  incident_id text        not null,
  agency      text        not null,
  author      text,
  unit        text,
  category    text        not null default 'general'
    check (category in ('hazard', 'medical', 'evacuation', 'security', 'resource_update', 'general')),
  message     text        not null check (char_length(btrim(message)) > 0),
  created_at  timestamptz not null default now()
);

create index if not exists responder_incident_logs_incident_id_idx
  on responder_incident_logs (incident_id, created_at);

create index if not exists responder_incident_logs_agency_idx
  on responder_incident_logs (agency);

alter table responder_incident_logs enable row level security;

create policy "authenticated read responder logs"
  on responder_incident_logs for select
  using (auth.role() = 'authenticated');

create policy "authenticated insert responder logs"
  on responder_incident_logs for insert
  with check (auth.role() = 'authenticated');
