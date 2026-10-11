import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import config from '../config';
import { logger } from '../utils/logger';

/**
 * Supabase-backed session store for whatsapp-web.js `RemoteAuth`.
 *
 * Why this exists:
 * - HF Spaces (and any ephemeral host) wipe local disk on restart, which would
 *   lose the WhatsApp session and force re-pairing every time.
 * - When a host dies (like the reclaimed Oracle instance), a local-only session
 *   is lost for good.
 *
 * Storing the session in Supabase makes it host-independent: any deployment
 * (HF Space, Oracle, local PC) reuses the same pairing by pointing at the same
 * Supabase project. Session files (creds.json + signal key files) are stored
 * as JSON in the `wa_sessions` table — see
 * supabase/migrations/20261011000000_wa_sessions.sql.
 *
 * Table shape:
 *   wa_sessions(session_id text pk, creds jsonb, keys jsonb, updated_at timestamptz)
 *   keys = [{ "name": "<file name>", "content": "<file text>" }, ...]
 */

export interface SessionKeyFile {
  name: string;
  content: string;
}

export class SupabaseSessionStore {
  private client: SupabaseClient;
  private clientId: string;

  constructor(clientId: string = 'wa-transfer', supabaseUrl?: string, serviceRoleKey?: string) {
    this.clientId = clientId;
    this.client = createClient(
      supabaseUrl || config.supabase.url,
      serviceRoleKey || config.supabase.serviceRoleKey
    );
  }

  /** whatsapp-web.js RemoteAuth store interface */
  async sessionExists(options: { session: string }): Promise<boolean> {
    const { data, error } = await this.client
      .from('wa_sessions')
      .select('session_id')
      .eq('session_id', options.session)
      .maybeSingle();

    if (error) {
      logger.warn('SupabaseSessionStore.sessionExists failed', { error: error.message });
      return false;
    }
    return data !== null;
  }

  /** Download the session files from Supabase into the auth dir. */
  async extract(options: { session: string; path: string }): Promise<void> {
    const { data, error } = await this.client
      .from('wa_sessions')
      .select('creds, keys')
      .eq('session_id', options.session)
      .maybeSingle();

    if (error || !data) {
      logger.warn('SupabaseSessionStore.extract: no session found', {
        session: options.session,
        error: error?.message,
      });
      return;
    }

    fs.mkdirSync(options.path, { recursive: true });
    fs.writeFileSync(
      path.join(options.path, 'creds.json'),
      JSON.stringify(data.creds ?? {}),
      'utf8'
    );

    const keys: SessionKeyFile[] = Array.isArray(data.keys) ? data.keys : [];
    for (const key of keys) {
      const keyPath = path.join(options.path, key.name);
      fs.mkdirSync(path.dirname(keyPath), { recursive: true });
      fs.writeFileSync(keyPath, key.content, 'utf8');
    }

    logger.info('SupabaseSessionStore.extract: session restored', {
      session: options.session,
      keyFiles: keys.length,
    });
  }

  /** Upload the session files from the auth dir to Supabase. */
  async save(options: { session: string }): Promise<void> {
    const authDir = path.join('./wwebjs-auth', `session-${this.clientId}`);
    const credsPath = path.join(authDir, 'creds.json');

    if (!fs.existsSync(credsPath)) {
      logger.warn('SupabaseSessionStore.save: no creds.json to save', { authDir });
      return;
    }

    let creds: unknown;
    try {
      creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
    } catch (err) {
      logger.error('SupabaseSessionStore.save: failed to parse creds.json', err);
      return;
    }

    const keys: SessionKeyFile[] = this.readKeyFiles(authDir);

    const { error } = await this.client.from('wa_sessions').upsert(
      {
        session_id: options.session,
        creds,
        keys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'session_id' }
    );

    if (error) {
      logger.error('SupabaseSessionStore.save: upsert failed', error, {
        session: options.session,
      });
      return;
    }

    logger.debug('SupabaseSessionStore.save: session saved', {
      session: options.session,
      keyFiles: keys.length,
    });
  }

  /** Delete the session from Supabase (logout). */
  async delete(options: { session: string }): Promise<void> {
    const { error } = await this.client
      .from('wa_sessions')
      .delete()
      .eq('session_id', options.session);

    if (error) {
      logger.error('SupabaseSessionStore.delete failed', error, { session: options.session });
      return;
    }
    logger.info('SupabaseSessionStore.delete: session removed', { session: options.session });
  }

  /** Read every file under the session dir except creds.json (the signal key store). */
  private readKeyFiles(authDir: string): SessionKeyFile[] {
    const keys: SessionKeyFile[] = [];
    const walk = (dir: string, prefix = ''): void => {
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), rel);
        } else if (entry.name !== 'creds.json') {
          try {
            keys.push({ name: rel, content: fs.readFileSync(path.join(dir, entry.name), 'utf8') });
          } catch {
            // unreadable file — skip
          }
        }
      }
    };
    walk(authDir);
    return keys;
  }
}
