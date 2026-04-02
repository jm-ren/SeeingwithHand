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

-- =============================================
-- Images table (gallery catalogue)
-- =============================================

CREATE TABLE images (
    id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    filename        TEXT NOT NULL,
    title           TEXT NOT NULL DEFAULT '',
    caption         TEXT NOT NULL DEFAULT '',
    uploaded_by     TEXT NOT NULL DEFAULT '',
    upload_date     TEXT NOT NULL DEFAULT '',
    source_url      TEXT NOT NULL DEFAULT '',
    display_order   INTEGER NOT NULL DEFAULT 0,
    storage_path    TEXT,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at      TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_images_display_order ON images(display_order);

ALTER TABLE images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to images" ON images
    FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to images" ON images
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to images" ON images
    FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to images" ON images
    FOR DELETE USING (true);

CREATE TRIGGER update_images_updated_at BEFORE UPDATE ON images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for gallery images
INSERT INTO storage.buckets (id, name, public) VALUES ('gallery-images', 'gallery-images', true);

CREATE POLICY "Allow public upload to gallery-images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'gallery-images');

CREATE POLICY "Allow public read from gallery-images" ON storage.objects
    FOR SELECT USING (bucket_id = 'gallery-images');

CREATE POLICY "Allow public delete from gallery-images" ON storage.objects
    FOR DELETE USING (bucket_id = 'gallery-images');

-- Seed existing images
INSERT INTO images (id, filename, title, caption, uploaded_by, upload_date, source_url, display_order) VALUES
    ('img1', 'image 002_agnes martin', 'agnes martin in new mexico', 'Agnes Martin near her house in Cuba, New Mexico, 1974. Photograph © 2019 Gianfranco Gorgoni | Source: Sotheby''s', 'jiamin', '07-05-2025', 'https://sothebys-com.brightspotcdn.com/dims4/default/a2e121a/2147483647/strip/true/crop/2000x1326+0+0/resize/1154x765!/format/webp/quality/90/?url=http%3A%2F%2Fsothebys-brightspot.s3.amazonaws.com%2Fdotcom%2Fd3%2F97%2Fa680e339451494c920b665f4173a%2Fagnes-martin-in-new-mexico.jpg', 1),
    ('img2', 'image 001_villa savoye', 'villa savoye', 'Le Corbusier: Villa Savoye in Poissy, France, 1928-1931 | Photo by Fondation Le Corbusier, Courtesy of Phaidon and The Modern House', 'jiamin', '07-05-2025', 'https://www.dwell.com/article/dive-into-a-visually-stunning-book-that-celebrates-modernist-architecture-and-its-evolution-ab96e4e4', 2),
    ('img3', 'image 003_morandi_landscape_cottage', 'morandi''s cottage', 'Giorgio Morandi Italian, 1890-1964 | Paesaggio, 1960 | Oil on Canvas | h. 25 × 30 cm | Source: ML Fine Art', 'jiamin', '07-05-2025', 'https://www.mlfineart.com/artists/50-giorgio-morandi/works/631-giorgio-morandi-paesaggio-1960/', 3),
    ('img4', 'image 004_brancusi studio', 'brancusi''s flower', 'Constantin Brâncuși Romanian, 1876-1957 | Studio View: The Sorceress, Torso of a Young Girl, The Newborn and Mademoiselle Pogany II, c. 1923 | Gelatin silver print, printed c. 1923 | source: Bruce Silverstein Gallery', 'jiamin', '07-05-2025', 'https://brucesilverstein.com/exhibitions/28/works/artworks-13147-constantin-brancusi-studio-view-the-sorceress-torso-of-a-young-c.-1923/', 4);
