-- incident_reports: one structured report per user per dispatched incident
create table if not exists incident_reports (
  id                 uuid        primary key default gen_random_uuid(),
  incident_id        text        not null,
  agency             text        not null,
  author_id          uuid        not null references auth.users(id),
  author_name        text,
  situation_summary  text        not null,
  casualties         jsonb,
  location           text,
  resources_deployed text,
  actions_taken      text,
  hazards            text[]      not null default '{}',
  next_steps         text,
  status             text        not null default 'draft'
    check (status in ('draft', 'submitted', 'acknowledged')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint incident_reports_one_per_user unique (incident_id, author_id)
);

create index if not exists incident_reports_incident_id_idx on incident_reports (incident_id);
create index if not exists incident_reports_agency_idx       on incident_reports (agency);
create index if not exists incident_reports_author_id_idx    on incident_reports (author_id);

-- keep updated_at current
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists incident_reports_updated_at on incident_reports;
create trigger incident_reports_updated_at
  before update on incident_reports
  for each row execute procedure set_updated_at();

-- RLS
alter table incident_reports enable row level security;

create policy "authenticated read all reports"
  on incident_reports for select
  using (auth.role() = 'authenticated');

create policy "authenticated insert own report"
  on incident_reports for insert
  with check (
    auth.role() = 'authenticated'
    and author_id = auth.uid()
  );

-- UPDATE is open to any authenticated user; status-transition rules live in service layer
create policy "authenticated update reports"
  on incident_reports for update
  using (auth.role() = 'authenticated');
