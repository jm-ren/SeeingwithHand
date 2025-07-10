-- Create sessions table
CREATE TABLE sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_name TEXT NOT NULL,
    image_id TEXT NOT NULL,
    session_id TEXT NOT NULL UNIQUE,
    annotations JSONB DEFAULT '[]'::jsonb,
    groups JSONB DEFAULT '[]'::jsonb,
    audio_url TEXT,
    survey_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_sessions_image_id ON sessions(image_id);
CREATE INDEX idx_sessions_session_id ON sessions(session_id);
CREATE INDEX idx_sessions_created_at ON sessions(created_at);

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