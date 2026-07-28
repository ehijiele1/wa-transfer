-- Migration 2026-07-28: Add missing columns for Supabase service-role isolation
-- This migration aligns the database schema with the new least-privilege client structure

-- Add missing columns from whatsapp_messages table
ALTER TABLE whatsapp_messages 
ADD COLUMN IF NOT EXISTS from_number TEXT,
ADD COLUMN IF NOT EXISTS to_number TEXT;

-- Ensure existing data is migrated (if needed)
UPDATE whatsapp_messages 
SET from_number = from, 
    to_number = to
WHERE from_number IS NULL OR to_number IS NULL;

-- Add missing columns from property_listings table
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS source_group TEXT,
ADD COLUMN IF NOT EXISTS timestamp BIGINT,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS embeddings JSONB;

-- Add missing columns from promotions table
ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS source_group TEXT,
ADD COLUMN IF NOT EXISTS timestamp BIGINT,
ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS embeddings JSONB;

-- Add index for better performance on frequently queried columns
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_processed ON whatsapp_messages(processed);
CREATE INDEX IF NOT EXISTS idx_property_listings_processed ON property_listings(processed);
CREATE INDEX IF NOT EXISTS idx_promotions_processed ON promotions(processed);

-- Add index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_property_listings_timestamp ON property_listings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_promotions_timestamp ON promotions(timestamp DESC);