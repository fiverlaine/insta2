
-- Create live_config table
CREATE TABLE IF NOT EXISTS live_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN DEFAULT FALSE,
    video_url TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    viewer_count_min INTEGER DEFAULT 1000,
    viewer_count_max INTEGER DEFAULT 5000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Separate live_comments table
CREATE TABLE IF NOT EXISTS live_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    message TEXT NOT NULL,
    avatar_url TEXT,
    video_timestamp INTEGER, -- triggers at specific second in video playback; NULL for random loop
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and public access for live_config
ALTER TABLE live_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select live_config" ON live_config FOR SELECT USING (true);
CREATE POLICY "Public insert live_config" ON live_config FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update live_config" ON live_config FOR UPDATE USING (true);
CREATE POLICY "Public delete live_config" ON live_config FOR DELETE USING (true);

-- Enable RLS and public access for live_comments
ALTER TABLE live_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select live_comments" ON live_comments FOR SELECT USING (true);
CREATE POLICY "Public insert live_comments" ON live_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update live_comments" ON live_comments FOR UPDATE USING (true);
CREATE POLICY "Public delete live_comments" ON live_comments FOR DELETE USING (true);

-- Insert a default config row if not exists
INSERT INTO live_config (is_active, video_url, viewer_count_min, viewer_count_max)
SELECT false, '', 1000, 5000
WHERE NOT EXISTS (SELECT 1 FROM live_config);
