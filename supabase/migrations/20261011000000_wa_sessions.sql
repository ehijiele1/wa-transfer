-- WhatsApp session storage for whatsapp-web.js RemoteAuth
-- Backed by SupabaseSessionStore (src/services/supabaseAuth.ts).
-- Keeps the WhatsApp pairing host-independent: HF Spaces, Oracle, or local PC
-- all reuse the same session when pointing at this Supabase project.
-- Service-role only: no browser access, no RLS policies needed.

CREATE TABLE IF NOT EXISTS wa_sessions (
  session_id TEXT PRIMARY KEY,
  creds      JSONB NOT NULL,
  keys       JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- No RLS: this table is only ever touched server-side with the service-role
-- key. Deny anon access explicitly.
ALTER TABLE wa_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_sessions_updated_at ON wa_sessions (updated_at DESC);
