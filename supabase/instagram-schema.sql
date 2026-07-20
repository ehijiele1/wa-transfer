-- Instagram Tables Migration

-- Create instagram_carousels table
CREATE TABLE IF NOT EXISTS instagram_carousels (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES property_listings(id) ON DELETE CASCADE,
    caption TEXT NOT NULL,
    hashtags TEXT[], -- Array of hashtags
    slides JSONB, -- Array of slide objects
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    published_at TIMESTAMP WITH TIME ZONE,
    media_container_id TEXT,
    permalink TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_instagram_carousels_property_id ON instagram_carousels(property_id);
CREATE INDEX IF NOT EXISTS idx_instagram_carousels_status ON instagram_carousels(status);
CREATE INDEX IF NOT EXISTS idx_instagram_carousels_published_at ON instagram_carousels(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_carousels_created_at ON instagram_carousels(created_at DESC);

-- Add instagram_published column to property_listings if it doesn't exist
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS instagram_published BOOLEAN DEFAULT FALSE;

-- Add instagram_published_at column to property_listings if it doesn't exist
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS instagram_published_at TIMESTAMP WITH TIME ZONE;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for instagram_carousels table
CREATE TRIGGER update_instagram_carousels_updated_at 
    BEFORE UPDATE ON instagram_carousels 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Create view for recently published carousels
CREATE OR REPLACE VIEW recent_instagram_posts AS
SELECT 
    ic.id,
    ic.property_id,
    pl.title as property_title,
    pl.location as property_location,
    ic.caption,
    ic.hashtags,
    ic.permalink,
    ic.published_at,
    ic.created_at
FROM instagram_carousels ic
JOIN property_listings pl ON ic.property_id = pl.id
WHERE ic.status = 'published'
ORDER BY ic.published_at DESC
LIMIT 20;

-- Create function to search similar Instagram content
CREATE OR REPLACE FUNCTION search_similar_carousels(search_query TEXT, limit_num INTEGER DEFAULT 5)
RETURNS TABLE (
    id TEXT,
    property_id TEXT,
    caption TEXT,
    hashtags TEXT[],
    similarity_score FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ic.id,
        ic.property_id,
        ic.caption,
        ic.hashtags,
        1.0 -- In a real implementation, this would be a actual similarity score
    FROM instagram_carousels ic
    JOIN property_listings pl ON ic.property_id = pl.id
    WHERE ic.status = 'published'
    AND (
        ic.caption ILIKE '%' || search_query || '%'
        OR pl.title ILIKE '%' || search_query || '%'
        OR pl.location ILIKE '%' || search_query || '%'
    )
    ORDER BY ic.published_at DESC
    LIMIT limit_num;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT ALL ON instagram_carousels TO authenticated;
-- GRANT ALL ON recent_instagram_posts TO authenticated;
-- GRANT ALL ON FUNCTION search_similar_carousels(TEXT, INTEGER) TO authenticated;