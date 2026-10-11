import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const upsert = jest.fn().mockResolvedValue({ error: null });
const deleteEq = jest.fn().mockResolvedValue({ error: null });
const maybeSingle = jest.fn();
const eq = jest.fn(() => ({ maybeSingle }));
const select = jest.fn(() => ({ eq }));
const from = jest.fn(() => ({
  select,
  upsert,
  delete: () => ({ eq: deleteEq }),
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ from })),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { SupabaseSessionStore } from '../../src/services/supabaseAuth';

describe('SupabaseSessionStore (whatsapp-web.js RemoteAuth store)', () => {
  const SESSION = 'wa-transfer';
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wa-session-test-'));
    originalCwd = process.cwd();
    process.chdir(tmpDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function writeLocalSession(creds: unknown = { me: { id: '123' } }): string {
    const dir = path.join(tmpDir, 'wwebjs-auth', `session-${SESSION}`);
    fs.mkdirSync(path.join(dir, 'keys'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'creds.json'), JSON.stringify(creds));
    fs.writeFileSync(path.join(dir, 'keys', 'pre-key.1.json'), '{"key":"value"}');
    return dir;
  }

  describe('sessionExists', () => {
    it('returns true when the session row exists', async () => {
      maybeSingle.mockResolvedValue({ data: { session_id: SESSION }, error: null });
      await expect(new SupabaseSessionStore().sessionExists({ session: SESSION })).resolves.toBe(true);
    });

    it('returns false when there is no row', async () => {
      maybeSingle.mockResolvedValue({ data: null, error: null });
      await expect(new SupabaseSessionStore().sessionExists({ session: SESSION })).resolves.toBe(false);
    });

    it('returns false (does not throw) on query error', async () => {
      maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
      await expect(new SupabaseSessionStore().sessionExists({ session: SESSION })).resolves.toBe(false);
    });
  });

  describe('save', () => {
    it('upserts creds and key files read from the session dir', async () => {
      writeLocalSession({ me: { id: '123' } });

      await new SupabaseSessionStore().save({ session: SESSION });

      expect(upsert).toHaveBeenCalledTimes(1);
      const [row, opts] = upsert.mock.calls[0];
      expect(row.session_id).toBe(SESSION);
      expect(row.creds).toEqual({ me: { id: '123' } });
      expect(row.keys).toEqual([{ name: 'keys/pre-key.1.json', content: '{"key":"value"}' }]);
      expect(opts).toEqual({ onConflict: 'session_id' });
    });

    it('does nothing when creds.json is missing', async () => {
      await new SupabaseSessionStore().save({ session: SESSION });
      expect(upsert).not.toHaveBeenCalled();
    });
  });

  describe('extract', () => {
    it('writes creds and key files into the auth dir', async () => {
      const authPath = path.join(tmpDir, 'restored');
      maybeSingle.mockResolvedValue({
        data: {
          creds: { me: { id: '456' } },
          keys: [{ name: 'keys/pre-key.2.json', content: '{"k":1}' }],
        },
        error: null,
      });

      await new SupabaseSessionStore().extract({ session: SESSION, path: authPath });

      expect(JSON.parse(fs.readFileSync(path.join(authPath, 'creds.json'), 'utf8')))
        .toEqual({ me: { id: '456' } });
      expect(fs.readFileSync(path.join(authPath, 'keys', 'pre-key.2.json'), 'utf8'))
        .toBe('{"k":1}');
    });

    it('does not throw when no session row exists', async () => {
      maybeSingle.mockResolvedValue({ data: null, error: null });
      await expect(
        new SupabaseSessionStore().extract({ session: SESSION, path: path.join(tmpDir, 'x') })
      ).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('deletes the session row by id', async () => {
      await new SupabaseSessionStore().delete({ session: SESSION });
      expect(deleteEq).toHaveBeenCalledWith('session_id', SESSION);
    });
  });
});
