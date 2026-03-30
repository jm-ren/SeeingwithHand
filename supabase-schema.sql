-- Create sessions table
CREATE TABLE sessions (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name    TEXT NOT NULL,
    session_id      TEXT NOT NULL UNIQUE,
    image_id        TEXT NOT NULL,

    annotations     JSONB DEFAULT '[]'::jsonb,
    groups          JSONB DEFAULT '[]'::jsonb,
    session_events  JSONB DEFAULT '[]'::jsonb,

    audio_url       TEXT,
    audio_started_at BIGINT,

    session_start_time BIGINT NOT NULL,
    session_end_time   BIGINT NOT NULL,
    duration_ms        BIGINT NOT NULL,

    nickname        TEXT DEFAULT '',
    location        TEXT DEFAULT '',
    weather         TEXT DEFAULT '',
    mood            TEXT DEFAULT '',
    feelings        TEXT DEFAULT '',

    additional_context JSONB DEFAULT '[]'::jsonb,

    is_public       BOOLEAN DEFAULT true,
    share_slug      TEXT UNIQUE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_image_id ON sessions(image_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);
CREATE INDEX idx_sessions_is_public ON sessions(is_public);
CREATE INDEX idx_sessions_share_slug ON sessions(share_slug);

-- Create RLS policies (Row Level Security)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Allow public read access to sessions
CREATE POLICY "Allow public read access to sessions" ON sessions
    FOR SELECT USING (true);

-- Allow public insert access to sessions
CREATE POLICY "Allow public insert access to sessions" ON sessions
    FOR INSERT WITH CHECK (true);

-- Allow public update access to sessions
CREATE POLICY "Allow public update access to sessions" ON sessions
    FOR UPDATE USING (true);

-- Create storage bucket for audio recordings
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-recordings', 'audio-recordings', true);

-- Create storage policy for audio recordings
CREATE POLICY "Allow public upload to audio-recordings" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'audio-recordings');

CREATE POLICY "Allow public read from audio-recordings" ON storage.objects
    FOR SELECT USING (bucket_id = 'audio-recordings');

-- Create storage bucket for context files
INSERT INTO storage.buckets (id, name, public) VALUES ('context-files', 'context-files', true);

-- Create storage policy for context files
CREATE POLICY "Allow public upload to context-files" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'context-files');

CREATE POLICY "Allow public read from context-files" ON storage.objects
    FOR SELECT USING (bucket_id = 'context-files');

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
