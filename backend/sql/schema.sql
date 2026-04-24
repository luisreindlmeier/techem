-- Drop old flat raw table if it exists
drop table if exists public.property_readings cascade;

-- Properties: one per source CSV file
create table if not exists public.properties (
  id integer primary key,
  city text not null,
  zipcode text not null,
  energysource text not null,
  emission_factor_g_kwh numeric not null
);

-- Units: unique unit within a property
create table if not exists public.units (
  id bigint generated always as identity primary key,
  property_id integer not null references public.properties (id),
  unitnumber integer not null,
  unique (property_id, unitnumber)
);

create index if not exists units_property_id_idx on public.units (property_id);

-- Rooms: unique room within a unit
create table if not exists public.rooms (
  id bigint generated always as identity primary key,
  unit_id bigint not null references public.units (id),
  roomnumber integer not null,
  livingspace_m2 numeric not null,
  unique (unit_id, roomnumber)
);

create index if not exists rooms_unit_id_idx on public.rooms (unit_id);

-- Readings: one energy reading per room per day
create table if not exists public.readings (
  id bigint generated always as identity primary key,
  room_id bigint not null references public.rooms (id),
  reading_date date not null,
  energy_usage_kwh numeric not null,
  outside_temp_c numeric not null,
  unique (room_id, reading_date)
);

create index if not exists readings_date_idx on public.readings (reading_date);
create index if not exists readings_room_id_idx on public.readings (room_id);

-- Aggregated daily metrics — consumed by the FastAPI backend
create table if not exists public.daily_property_metrics (
  reading_date date primary key,
  total_energy_kwh numeric not null,
  total_emission_kg_co2e numeric not null,
  property_count integer not null,
  updated_at timestamptz not null default now()
);

create index if not exists daily_property_metrics_updated_at_idx
  on public.daily_property_metrics (updated_at);
