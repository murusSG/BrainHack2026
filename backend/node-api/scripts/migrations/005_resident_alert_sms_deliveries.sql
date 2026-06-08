-- External notification delivery audit trail for resident alert broadcasts.
-- This stores SMS, WhatsApp, and Telegram delivery attempts without exposing alert content.

create table if not exists resident_alert_deliveries (
  id                  uuid primary key default gen_random_uuid(),
  alert_id            text not null references resident_alerts (id) on delete cascade,
  channel             text not null default 'sms' check (channel in ('sms', 'whatsapp', 'telegram')),
  recipient           text not null,
  status              text not null check (status in ('sent', 'failed', 'skipped')),
  provider            text not null default 'twilio',
  provider_message_id text,
  error_message       text,
  created_at          timestamptz not null default now()
);

create index if not exists idx_resident_alert_deliveries_alert_id
  on resident_alert_deliveries (alert_id, created_at desc);

create index if not exists idx_resident_alert_deliveries_status
  on resident_alert_deliveries (status, created_at desc);
