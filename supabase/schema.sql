-- Anonymous telemetry for SmartPasteHub
-- Run this in Supabase SQL Editor to set up the table

CREATE TABLE IF NOT EXISTS telemetry_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id uuid NOT NULL,
  app_version text NOT NULL DEFAULT '0.0.0',
  os_version text DEFAULT '',
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for analytics queries
CREATE INDEX IF NOT EXISTS idx_telemetry_device ON telemetry_events(device_id);
CREATE INDEX IF NOT EXISTS idx_telemetry_event_type ON telemetry_events(event_type);
CREATE INDEX IF NOT EXISTS idx_telemetry_created ON telemetry_events(created_at);

-- Enable RLS - CRITICAL for security
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;

-- Drop previous policy to avoid \"policy already exists\" error
DROP POLICY IF EXISTS "anon_insert_only" ON telemetry_events;

-- Allow anonymous inserts only (no read/update/delete on raw data)
CREATE POLICY "anon_insert_only" ON telemetry_events
  FOR INSERT TO anon
  WITH CHECK (true);

-- Drop previous views to allow clean recreation without type mismatches
DROP VIEW IF EXISTS telemetry_daily;
DROP VIEW IF EXISTS telemetry_lifetime;

-- Aggregated daily view for dashboard
CREATE VIEW telemetry_daily AS
SELECT
  date_trunc('day', created_at) AS day,
  COUNT(DISTINCT device_id) AS unique_devices,
  COUNT(*) FILTER (WHERE event_type = 'paste') AS total_pastes,
  COUNT(*) FILTER (WHERE event_type = 'ai_rewrite') AS total_ai_rewrites,
  COUNT(*) FILTER (WHERE event_type = 'ocr') AS total_ocr,
  COUNT(*) FILTER (WHERE event_type = 'app_start') AS app_starts,
  SUM(NULLIF(metadata->>'chars_cleaned', '')::numeric) FILTER (WHERE event_type = 'paste') AS total_chars_cleaned
FROM telemetry_events
GROUP BY 1
ORDER BY 1 DESC;

-- Lifetime aggregate view for public landing page
CREATE VIEW telemetry_lifetime AS
SELECT
  COUNT(DISTINCT device_id) AS total_devices,
  COUNT(*) FILTER (WHERE event_type = 'paste') AS total_pastes,
  COUNT(*) FILTER (WHERE event_type = 'ai_rewrite') AS total_ai_rewrites,
  COUNT(*) FILTER (WHERE event_type = 'ocr') AS total_ocr,
  COUNT(*) FILTER (WHERE event_type = 'translate') AS total_translates,
  COALESCE(SUM(NULLIF(metadata->>'chars_cleaned', '')::numeric) FILTER (WHERE event_type = 'paste'), 0) AS total_chars_cleaned
FROM telemetry_events;

-- Remove the raw select policy if it exists, as it exposes all user data!
DROP POLICY IF EXISTS "anon_select_lifetime_stats" ON telemetry_events;

-- Instead, grant SELECT on the aggregated views to anon. 
-- Views bypass RLS securely by running as the view creator, exposing only the aggregates.
GRANT SELECT ON telemetry_daily TO anon;
GRANT SELECT ON telemetry_lifetime TO anon;
