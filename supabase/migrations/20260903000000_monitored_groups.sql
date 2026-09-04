-- Migration 2026-09-03: monitored_groups table for Phase 0
-- Enables WhatsApp group registration via "WATM Good Afternoon" trigger message
-- Run in Supabase SQL Editor or via `supabase db push`

-- ============================================================
-- 1. monitored_groups table
-- ============================================================
CREATE TABLE IF NOT EXISTS monitored_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL UNIQUE,
  group_name TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_seen_message_at TIMESTAMPTZ,
  message_count INTEGER NOT NULL DEFAULT 0,
  registered_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_monitored_groups_group_id ON monitored_groups (group_id);
CREATE INDEX IF NOT EXISTS idx_monitored_groups_is_active ON monitored_groups (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_monitored_groups_registered_at ON monitored_groups (registered_at DESC);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_monitored_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monitored_groups_updated_at ON monitored_groups;
CREATE TRIGGER trg_monitored_groups_updated_at
  BEFORE UPDATE ON monitored_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_monitored_groups_updated_at();

-- ============================================================
-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE monitored_groups ENABLE ROW LEVEL SECURITY;

-- Anon role: full CRUD (app runs server-side with anon key)
DROP POLICY IF EXISTS "allow anon all monitored_groups" ON monitored_groups;
CREATE POLICY "allow anon all monitored_groups"
  ON monitored_groups
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 3. Helper function: is_group_monitored
-- ============================================================
CREATE OR REPLACE FUNCTION is_group_monitored(p_group_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM monitored_groups
    WHERE group_id = p_group_id AND is_active = TRUE
  );
$$;

-- ============================================================
-- 4. Helper function: register_group (idempotent)
-- ============================================================
CREATE OR REPLACE FUNCTION register_group(
  p_group_id TEXT,
  p_group_name TEXT DEFAULT NULL,
  p_registered_by TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  group_id TEXT,
  group_name TEXT,
  is_active BOOLEAN,
  was_already_registered BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing monitored_groups%ROWTYPE;
  v_result monitored_groups%ROWTYPE;
BEGIN
  -- Check if already exists
  SELECT * INTO v_existing
  FROM monitored_groups
  WHERE monitored_groups.group_id = p_group_id;

  IF FOUND THEN
    -- Reactivate if inactive
    IF NOT v_existing.is_active THEN
      UPDATE monitored_groups
      SET is_active = TRUE, updated_at = NOW()
      WHERE monitored_groups.group_id = p_group_id
      RETURNING * INTO v_result;

      RETURN QUERY SELECT v_result.id, v_result.group_id, v_result.group_name, v_result.is_active, TRUE;
    ELSE
      -- Already active
      RETURN QUERY SELECT v_existing.id, v_existing.group_id, v_existing.group_name, v_existing.is_active, TRUE;
    END IF;
  ELSE
    -- New registration
    INSERT INTO monitored_groups (group_id, group_name, registered_by)
    VALUES (p_group_id, p_group_name, p_registered_by)
    RETURNING * INTO v_result;

    RETURN QUERY SELECT v_result.id, v_result.group_id, v_result.group_name, v_result.is_active, FALSE;
  END IF;
END;
$$;

-- ============================================================
-- 5. Helper function: increment_message_count
-- ============================================================
CREATE OR REPLACE FUNCTION increment_group_message_count(p_group_id TEXT)
RETURNS VOID
LANGUAGE sql
AS $$
  UPDATE monitored_groups
  SET
    message_count = message_count + 1,
    last_seen_message_at = NOW()
  WHERE group_id = p_group_id AND is_active = TRUE;
$$;

-- ============================================================
-- 6. Comments
-- ============================================================
COMMENT ON TABLE monitored_groups IS 'WhatsApp groups registered for monitoring via WATM Good Afternoon trigger';
COMMENT ON COLUMN monitored_groups.group_id IS 'WhatsApp group ID (e.g., 120363@g.us)';
COMMENT ON COLUMN monitored_groups.is_active IS 'Whether the group is currently being monitored';
COMMENT ON COLUMN monitored_groups.registered_by IS 'Phone number or identifier of who registered the group';
COMMENT ON FUNCTION is_group_monitored IS 'Check if a group is actively monitored';
COMMENT ON FUNCTION register_group IS 'Idempotently register or reactivate a group';
COMMENT ON FUNCTION increment_group_message_count IS 'Atomically increment message counter for a group';
