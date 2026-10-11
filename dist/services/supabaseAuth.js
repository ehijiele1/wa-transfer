"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseSessionStore = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const config_1 = __importDefault(require("../config"));
const logger_1 = require("../utils/logger");
class SupabaseSessionStore {
    client;
    clientId;
    constructor(clientId = 'wa-transfer', supabaseUrl, serviceRoleKey) {
        this.clientId = clientId;
        this.client = (0, supabase_js_1.createClient)(supabaseUrl || config_1.default.supabase.url, serviceRoleKey || config_1.default.supabase.serviceRoleKey);
    }
    async sessionExists(options) {
        const { data, error } = await this.client
            .from('wa_sessions')
            .select('session_id')
            .eq('session_id', options.session)
            .maybeSingle();
        if (error) {
            logger_1.logger.warn('SupabaseSessionStore.sessionExists failed', { error: error.message });
            return false;
        }
        return data !== null;
    }
    async extract(options) {
        const { data, error } = await this.client
            .from('wa_sessions')
            .select('creds, keys')
            .eq('session_id', options.session)
            .maybeSingle();
        if (error || !data) {
            logger_1.logger.warn('SupabaseSessionStore.extract: no session found', {
                session: options.session,
                error: error?.message,
            });
            return;
        }
        fs.mkdirSync(options.path, { recursive: true });
        fs.writeFileSync(path.join(options.path, 'creds.json'), JSON.stringify(data.creds ?? {}), 'utf8');
        const keys = Array.isArray(data.keys) ? data.keys : [];
        for (const key of keys) {
            const keyPath = path.join(options.path, key.name);
            fs.mkdirSync(path.dirname(keyPath), { recursive: true });
            fs.writeFileSync(keyPath, key.content, 'utf8');
        }
        logger_1.logger.info('SupabaseSessionStore.extract: session restored', {
            session: options.session,
            keyFiles: keys.length,
        });
    }
    async save(options) {
        const authDir = path.join('./wwebjs-auth', `session-${this.clientId}`);
        const credsPath = path.join(authDir, 'creds.json');
        if (!fs.existsSync(credsPath)) {
            logger_1.logger.warn('SupabaseSessionStore.save: no creds.json to save', { authDir });
            return;
        }
        let creds;
        try {
            creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
        }
        catch (err) {
            logger_1.logger.error('SupabaseSessionStore.save: failed to parse creds.json', err);
            return;
        }
        const keys = this.readKeyFiles(authDir);
        const { error } = await this.client.from('wa_sessions').upsert({
            session_id: options.session,
            creds,
            keys,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'session_id' });
        if (error) {
            logger_1.logger.error('SupabaseSessionStore.save: upsert failed', error, {
                session: options.session,
            });
            return;
        }
        logger_1.logger.debug('SupabaseSessionStore.save: session saved', {
            session: options.session,
            keyFiles: keys.length,
        });
    }
    async delete(options) {
        const { error } = await this.client
            .from('wa_sessions')
            .delete()
            .eq('session_id', options.session);
        if (error) {
            logger_1.logger.error('SupabaseSessionStore.delete failed', error, { session: options.session });
            return;
        }
        logger_1.logger.info('SupabaseSessionStore.delete: session removed', { session: options.session });
    }
    readKeyFiles(authDir) {
        const keys = [];
        const walk = (dir, prefix = '') => {
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
                if (entry.isDirectory()) {
                    walk(path.join(dir, entry.name), rel);
                }
                else if (entry.name !== 'creds.json') {
                    try {
                        keys.push({ name: rel, content: fs.readFileSync(path.join(dir, entry.name), 'utf8') });
                    }
                    catch {
                    }
                }
            }
        };
        walk(authDir);
        return keys;
    }
}
exports.SupabaseSessionStore = SupabaseSessionStore;
//# sourceMappingURL=supabaseAuth.js.map