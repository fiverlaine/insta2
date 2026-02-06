-- Migration: Story Views Precision Enhancements
-- Executed via Supabase migration 20251112_story_view_precision
-- Objetivo: registrar sessões e métricas detalhadas de visualização de stories

ALTER TABLE public.story_views
  ADD COLUMN IF NOT EXISTS session_id uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS session_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS watch_time_ms integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewed_percentage numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS first_viewed_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS last_viewed_at timestamptz DEFAULT timezone('utc', now()),
  ADD COLUMN IF NOT EXISTS exit_reason text,
  ADD COLUMN IF NOT EXISTS playback_events jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_story_views_session_id ON public.story_views(session_id);
CREATE INDEX IF NOT EXISTS idx_story_views_last_viewed_at ON public.story_views(last_viewed_at DESC);

CREATE OR REPLACE VIEW public.story_view_stats AS
SELECT
  story_id,
  COUNT(DISTINCT fingerprint) AS unique_views,
  SUM(session_count) AS total_views,
  COUNT(DISTINCT ip_address) AS unique_ips,
  COUNT(DISTINCT visitor_id) AS unique_visitors,
  COUNT(DISTINCT country) AS countries_count,
  COUNT(DISTINCT city) AS cities_count,
  COUNT(DISTINCT device_type) AS device_types_count,
  MAX(last_viewed_at) AS last_viewed_at,
  MIN(first_viewed_at) AS first_viewed_at,
  SUM(session_count) FILTER (WHERE last_viewed_at >= timezone('utc', now()) - interval '24 hours') AS views_last_24h,
  SUM(CASE WHEN completed THEN session_count ELSE 0 END) AS completed_views,
  CASE 
    WHEN SUM(session_count) > 0 
    THEN ROUND(SUM(CASE WHEN completed THEN session_count ELSE 0 END)::numeric / SUM(session_count) * 100, 2)
    ELSE 0
  END AS completion_rate_percentage,
  ROUND(AVG(watch_time_ms)::numeric, 2) AS avg_watch_time_ms,
  ROUND(AVG(viewed_percentage)::numeric, 2) AS avg_viewed_percentage,
  SUM(watch_time_ms) AS total_watch_time_ms
FROM public.story_views
GROUP BY story_id;

DROP POLICY IF EXISTS "Public update story_views" ON public.story_views;
CREATE POLICY "Public update story_views" ON public.story_views
  FOR UPDATE TO public
  USING (true)
  WITH CHECK (true);

