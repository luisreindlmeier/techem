-- Run this once against your Supabase project (SQL editor or psql).
-- Adds display name, street address, centroid coordinates, OSM footprint polygon,
-- and building height to the properties table.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS name              TEXT,
  ADD COLUMN IF NOT EXISTS street            TEXT,
  ADD COLUMN IF NOT EXISTS lat               DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng               DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS footprint_polygon JSONB,
  ADD COLUMN IF NOT EXISTS building_height   INTEGER NOT NULL DEFAULT 12;
