-- Migration 2026-08-24: RLS policies + idempotency constraint
-- Run in Supabase SQL Editor or via `supabase db push`

-- ============================================================
-- 1. ROW LEVEL SECURITY on all tables
-- ============================================================
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_carousels ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_media_performance ENABLE ROW LEVEL SECURITY;

-- Anon role: full CRUD (app runs server-side; no public exposure via API keys)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'whatsapp_messages', 'property_listings', 'promotions',
    'instagram_carousels', 'social_media_posts', 'social_media_scheduled_posts',
    'content_queues', 'queue_posts', 'social_media_analytics',
    'ab_tests', 'ab_test_variants', 'social_media_performance'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "allow anon all" ON %I', t);
    EXECUTE format(
      'CREATE POLICY "allow anon all" ON %I FOR ALL TO anon USING (true) WITH CHECK (true)', t
    );
  END LOOP;
END $$;

-- ============================================================
-- 2. Idempotency for scheduled posts (prevents duplicate publishes)
-- ============================================================
ALTER TABLE social_media_scheduled_posts
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Enforce one published post per idempotency key
CREATE UNIQUE INDEX IF NOT EXISTS idx_scheduled_posts_idempotency_published
  ON social_media_scheduled_posts (idempotency_key)
  WHERE status = 'published' AND idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status_scheduled
  ON social_media_scheduled_posts (status, scheduled_at);
