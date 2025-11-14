-- Migration: Create Story Views Tracking Table
-- Este arquivo pode ser executado manualmente no Supabase SQL Editor
-- URL: https://supabase.com/dashboard/project/izuspwvgvozwdjzbrpvt/sql

-- Cria tabela de visualizações de stories com tracking completo (idêntica ao schema atual)
CREATE TABLE IF NOT EXISTS story_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  visitor_id TEXT NOT NULL,

  -- Informações de Rede/IP
  ip_address TEXT,
  country TEXT,
  city TEXT,
  region TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  isp TEXT,

  -- Informações de Dispositivo
  device_type TEXT,
  device_model TEXT,
  device_vendor TEXT,

  -- Informações de Browser/OS
  browser TEXT,
  browser_version TEXT,
  os TEXT,
  os_version TEXT,
  user_agent TEXT,

  -- Fingerprinting Avançado
  fingerprint TEXT NOT NULL,
  canvas_fingerprint TEXT,
  webgl_fingerprint TEXT,
  audio_fingerprint TEXT,
  fonts_fingerprint TEXT,

  -- Informações de Tela/Display
  screen_resolution TEXT,
  screen_color_depth INTEGER,
  pixel_ratio DOUBLE PRECISION,

  -- Informações de Idioma/Localização
  timezone TEXT,
  language TEXT,
  languages TEXT[],

  -- Timestamps
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),

  CONSTRAINT story_views_unique_fingerprint UNIQUE (story_id, fingerprint)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_visitor_id ON story_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_story_views_ip_address ON story_views(ip_address);
CREATE INDEX IF NOT EXISTS idx_story_views_viewed_at ON story_views(viewed_at DESC);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_story_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_story_views_updated_at ON story_views;
CREATE TRIGGER trigger_story_views_updated_at
  BEFORE UPDATE ON story_views
  FOR EACH ROW
  EXECUTE FUNCTION update_story_views_updated_at();

-- View para estatísticas agregadas de stories
CREATE OR REPLACE VIEW story_view_stats AS
SELECT 
  story_id,
  COUNT(DISTINCT fingerprint) AS unique_views,
  COUNT(*) AS total_views,
  COUNT(DISTINCT ip_address) AS unique_ips,
  COUNT(DISTINCT visitor_id) AS unique_visitors,
  COUNT(DISTINCT country) AS countries_count,
  COUNT(DISTINCT city) AS cities_count,
  COUNT(DISTINCT device_type) AS device_types_count,
  MAX(viewed_at) AS last_viewed_at,
  MIN(viewed_at) AS first_viewed_at
FROM story_views
GROUP BY story_id;

COMMENT ON TABLE story_views IS 'Tabela para tracking completo de visualizações de stories com fingerprinting avançado';
COMMENT ON COLUMN story_views.fingerprint IS 'Fingerprint único combinado para deduplicação de visualizações por story';
COMMENT ON VIEW story_view_stats IS 'View com estatísticas agregadas de visualizações por story';

-- Habilita RLS e políticas alinhadas ao projeto
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert story views" ON story_views;
DROP POLICY IF EXISTS "Allow authenticated read story views" ON story_views;
DROP POLICY IF EXISTS "Public read story_views" ON story_views;
DROP POLICY IF EXISTS "Public insert story_views" ON story_views;
DROP POLICY IF EXISTS "Public delete story_views" ON story_views;

CREATE POLICY "Public read story_views" ON story_views
  FOR SELECT TO public
  USING (true);

CREATE POLICY "Public insert story_views" ON story_views
  FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Public delete story_views" ON story_views
  FOR DELETE TO public
  USING (true);

