-- Run this in your Supabase SQL editor to create the four data ingestion tables.

create extension if not exists "uuid-ossp";

-- NEA environmental readings (PSI, PM2.5)
create table if not exists environmental_readings (
  id          uuid primary key default uuid_generate_v4(),
  fetched_at  timestamptz not null,
  region      text,
  psi         numeric,
  pm25        numeric,
  rainfall    numeric,
  raw_data    jsonb
);

-- NEA dengue clusters
create table if not exists dengue_clusters (
  id          uuid primary key default uuid_generate_v4(),
  fetched_at  timestamptz not null,
  locality    text,
  case_size   integer,
  geometry    jsonb,
  raw_data    jsonb
);

-- PUB flood alerts
create table if not exists flood_alerts (
  id          uuid primary key default uuid_generate_v4(),
  fetched_at  timestamptz not null,
  location    text,
  severity    text,
  source      text,
  raw_data    jsonb
);

-- LTA transport incidents
create table if not exists transport_incidents (
  id          uuid primary key default uuid_generate_v4(),
  fetched_at  timestamptz not null,
  type        text,
  message     text,
  lat         numeric,
  lng         numeric,
  raw_data    jsonb
);
