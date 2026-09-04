"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupManager = exports.GroupManager = exports.TRIGGER_MESSAGE = void 0;
exports.getGroupManager = getGroupManager;
const supabaseClients_1 = require("./supabaseClients");
const logger_1 = require("../utils/logger");
exports.TRIGGER_MESSAGE = 'WATM Good Afternoon';
class GroupManager {
    inMemoryCache = new Set();
    cacheLoadedAt = 0;
    CACHE_TTL_MS = 60_000;
    getSupabase() {
        return (0, supabaseClients_1.getAnonClient)();
    }
    async loadCache() {
        const now = Date.now();
        if (now - this.cacheLoadedAt < this.CACHE_TTL_MS && this.inMemoryCache.size > 0) {
            return;
        }
        try {
            const { data, error } = await this.getSupabase()
                .from('monitored_groups')
                .select('group_id')
                .eq('is_active', true);
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42P01') {
                    logger_1.logger.warn('monitored_groups table does not exist yet; run migration 20260903000000');
                    return;
                }
                throw error;
            }
            this.inMemoryCache = new Set((data || []).map((r) => r.group_id));
            this.cacheLoadedAt = now;
            logger_1.logger.debug('Group cache loaded', { count: this.inMemoryCache.size });
        }
        catch (error) {
            logger_1.logger.error('Failed to load monitored groups cache', error);
        }
    }
    isTriggerMessage(text) {
        if (!text)
            return false;
        const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
        const expected = exports.TRIGGER_MESSAGE.toLowerCase();
        return normalized === expected;
    }
    isMonitored(groupId) {
        return this.inMemoryCache.has(groupId);
    }
    async isMonitoredAsync(groupId) {
        await this.loadCache();
        return this.inMemoryCache.has(groupId);
    }
    async registerGroup(groupId, groupName, registeredBy) {
        try {
            const { data, error } = await this.getSupabase().rpc('register_group', {
                p_group_id: groupId,
                p_group_name: groupName || null,
                p_registered_by: registeredBy || null,
            });
            if (error) {
                if (error.code === 'PGRST205' || error.code === '42883') {
                    logger_1.logger.warn('register_group RPC not available, falling back to direct insert', {
                        error: error.message,
                    });
                    return await this.registerGroupDirect(groupId, groupName, registeredBy);
                }
                throw error;
            }
            const row = Array.isArray(data) ? data[0] : data;
            if (!row) {
                throw new Error('register_group returned no rows');
            }
            this.inMemoryCache.add(groupId);
            logger_1.logger.info('Group registered', {
                groupId,
                groupName,
                wasAlreadyRegistered: row.was_already_registered,
            });
            return {
                success: true,
                group: this.mapRow(row),
                wasAlreadyRegistered: row.was_already_registered === true,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to register group', error, { groupId });
            return {
                success: false,
                group: null,
                wasAlreadyRegistered: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    async registerGroupDirect(groupId, groupName, registeredBy) {
        const { data, error } = await this.getSupabase()
            .from('monitored_groups')
            .upsert({
            group_id: groupId,
            group_name: groupName || null,
            registered_by: registeredBy || null,
            is_active: true,
        }, { onConflict: 'group_id' })
            .select()
            .single();
        if (error)
            throw error;
        this.inMemoryCache.add(groupId);
        logger_1.logger.info('Group registered (direct)', { groupId, groupName });
        return {
            success: true,
            group: this.mapRow(data),
            wasAlreadyRegistered: false,
        };
    }
    async unregisterGroup(groupId) {
        try {
            const { error } = await this.getSupabase()
                .from('monitored_groups')
                .update({ is_active: false })
                .eq('group_id', groupId);
            if (error)
                throw error;
            this.inMemoryCache.delete(groupId);
            logger_1.logger.info('Group unregistered', { groupId });
            return true;
        }
        catch (error) {
            logger_1.logger.error('Failed to unregister group', error, { groupId });
            return false;
        }
    }
    async getActiveGroups() {
        const { data, error } = await this.getSupabase()
            .from('monitored_groups')
            .select('*')
            .eq('is_active', true)
            .order('registered_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Failed to fetch active groups', error);
            return [];
        }
        return (data || []).map((r) => this.mapRow(r));
    }
    async getAllGroups() {
        const { data, error } = await this.getSupabase()
            .from('monitored_groups')
            .select('*')
            .order('registered_at', { ascending: false });
        if (error) {
            logger_1.logger.error('Failed to fetch all groups', error);
            return [];
        }
        return (data || []).map((r) => this.mapRow(r));
    }
    async incrementMessageCount(groupId) {
        try {
            const { error } = await this.getSupabase().rpc('increment_group_message_count', {
                p_group_id: groupId,
            });
            if (error && error.code !== '42883') {
                logger_1.logger.debug('Failed to increment message count via RPC', { groupId, error: error.message });
                await this.getSupabase()
                    .from('monitored_groups')
                    .update({
                    message_count: (await this.getMessageCount(groupId)) + 1,
                    last_seen_message_at: new Date().toISOString(),
                })
                    .eq('group_id', groupId);
            }
        }
        catch (error) {
            logger_1.logger.debug('Failed to increment message count', { groupId });
        }
    }
    async getMessageCount(groupId) {
        const { data } = await this.getSupabase()
            .from('monitored_groups')
            .select('message_count')
            .eq('group_id', groupId)
            .single();
        return data?.message_count || 0;
    }
    async refreshCache() {
        this.cacheLoadedAt = 0;
        await this.loadCache();
    }
    mapRow(row) {
        return {
            id: row.id,
            group_id: row.group_id,
            group_name: row.group_name,
            registered_at: row.registered_at,
            is_active: row.is_active,
            last_seen_message_at: row.last_seen_message_at,
            message_count: row.message_count || 0,
            registered_by: row.registered_by,
            notes: row.notes,
            created_at: row.created_at,
            updated_at: row.updated_at,
        };
    }
}
exports.GroupManager = GroupManager;
let groupManagerInstance = null;
function getGroupManager() {
    if (!groupManagerInstance) {
        groupManagerInstance = new GroupManager();
    }
    return groupManagerInstance;
}
exports.groupManager = getGroupManager();
exports.default = exports.groupManager;
//# sourceMappingURL=groupManager.js.map