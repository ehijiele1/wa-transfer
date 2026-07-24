-- WhatsApp Tables Migration

-- Create whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id TEXT PRIMARY KEY,
    from_number TEXT NOT NULL,
    to_number TEXT NOT NULL,
    timestamp BIGINT NOT NULL,
    message JSONB,
    type TEXT NOT NULL CHECK (type IN ('text', 'image', 'video', 'document')),
    metadata JSONB,
    source_group TEXT,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_source_group ON whatsapp_messages(source_group);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processed ON whatsapp_messages(processed);

-- Create property_listings table
CREATE TABLE IF NOT EXISTS property_listings (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    price TEXT,
    location TEXT,
    bedrooms INTEGER,
    bathrooms INTEGER,
    area TEXT,
    type TEXT NOT NULL CHECK (type IN ('house', 'apartment', 'commercial', 'land')),
    features TEXT[],
    images TEXT[],
    source TEXT,
    source_group TEXT,
    timestamp BIGINT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    embeddings JSONB,
    instagram_published BOOLEAN DEFAULT FALSE,
    instagram_published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_listings_type ON property_listings(type);
CREATE INDEX IF NOT EXISTS idx_property_listings_location ON property_listings(location);
CREATE INDEX IF NOT EXISTS idx_property_listings_processed ON property_listings(processed);
CREATE INDEX IF NOT EXISTS idx_property_listings_timestamp ON property_listings(timestamp DESC);

-- Create promotions table
CREATE TABLE IF NOT EXISTS promotions (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    discount TEXT,
    valid_until TIMESTAMP WITH TIME ZONE,
    terms TEXT,
    source TEXT,
    source_group TEXT,
    timestamp BIGINT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    embeddings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promotions_processed ON promotions(processed);
CREATE INDEX IF NOT EXISTS idx_promotions_timestamp ON promotions(timestamp DESC);
