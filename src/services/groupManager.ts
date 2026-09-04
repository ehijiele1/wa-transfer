/**
 * GroupManager Service
 *
 * Manages WhatsApp groups registered for monitoring via the
 * "WATM Good Afternoon" trigger message.
 *
 * Phase 0: Silent registration only (no reply in group).
 * Unregistration is dashboard-only (not in this phase).
 */

import { getAnonClient } from './supabaseClients';
import { logger } from '../utils/logger';

export interface MonitoredGroup {
  id: string;
  group_id: string;
  group_name: string | null;
  registered_at: string;
  is_active: boolean;
  last_seen_message_at: string | null;
  message_count: number;
  registered_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RegisterGroupResult {
  success: boolean;
  group: MonitoredGroup | null;
  wasAlreadyRegistered: boolean;
  error?: string;
}

export const TRIGGER_MESSAGE = 'WATM Good Afternoon';

export class GroupManager {
  private inMemoryCache: Set<string> = new Set();
  private cacheLoadedAt: number = 0;
  private readonly CACHE_TTL_MS = 60_000;

  private getSupabase() {
    return getAnonClient();
  }

  private async loadCache(): Promise<void> {
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
          logger.warn('monitored_groups table does not exist yet; run migration 20260903000000');
          return;
        }
        throw error;
      }

      this.inMemoryCache = new Set((data || []).map((r: any) => r.group_id));
      this.cacheLoadedAt = now;
      logger.debug('Group cache loaded', { count: this.inMemoryCache.size });
    } catch (error) {
      logger.error('Failed to load monitored groups cache', error as Error);
    }
  }

  isTriggerMessage(text: string | null | undefined): boolean {
    if (!text) return false;
    const normalized = text.trim().toLowerCase().replace(/\s+/g, ' ');
    const expected = TRIGGER_MESSAGE.toLowerCase();
    return normalized === expected;
  }

  isMonitored(groupId: string): boolean {
    return this.inMemoryCache.has(groupId);
  }

  async isMonitoredAsync(groupId: string): Promise<boolean> {
    await this.loadCache();
    return this.inMemoryCache.has(groupId);
  }

  async registerGroup(
    groupId: string,
    groupName?: string | null,
    registeredBy?: string | null
  ): Promise<RegisterGroupResult> {
    try {
      const { data, error } = await this.getSupabase().rpc('register_group', {
        p_group_id: groupId,
        p_group_name: groupName || null,
        p_registered_by: registeredBy || null,
      });

      if (error) {
        if (error.code === 'PGRST205' || error.code === '42883') {
          logger.warn('register_group RPC not available, falling back to direct insert', {
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

      logger.info('Group registered', {
        groupId,
        groupName,
        wasAlreadyRegistered: row.was_already_registered,
      });

      return {
        success: true,
        group: this.mapRow(row),
        wasAlreadyRegistered: row.was_already_registered === true,
      };
    } catch (error) {
      logger.error('Failed to register group', error as Error, { groupId });
      return {
        success: false,
        group: null,
        wasAlreadyRegistered: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async registerGroupDirect(
    groupId: string,
    groupName?: string | null,
    registeredBy?: string | null
  ): Promise<RegisterGroupResult> {
    const { data, error } = await this.getSupabase()
      .from('monitored_groups')
      .upsert(
        {
          group_id: groupId,
          group_name: groupName || null,
          registered_by: registeredBy || null,
          is_active: true,
        },
        { onConflict: 'group_id' }
      )
      .select()
      .single();

    if (error) throw error;

    this.inMemoryCache.add(groupId);

    logger.info('Group registered (direct)', { groupId, groupName });

    return {
      success: true,
      group: this.mapRow(data),
      wasAlreadyRegistered: false,
    };
  }

  async unregisterGroup(groupId: string): Promise<boolean> {
    try {
      const { error } = await this.getSupabase()
        .from('monitored_groups')
        .update({ is_active: false })
        .eq('group_id', groupId);

      if (error) throw error;

      this.inMemoryCache.delete(groupId);
      logger.info('Group unregistered', { groupId });
      return true;
    } catch (error) {
      logger.error('Failed to unregister group', error as Error, { groupId });
      return false;
    }
  }

  async getActiveGroups(): Promise<MonitoredGroup[]> {
    const { data, error } = await this.getSupabase()
      .from('monitored_groups')
      .select('*')
      .eq('is_active', true)
      .order('registered_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch active groups', error as Error);
      return [];
    }

    return (data || []).map((r: any) => this.mapRow(r));
  }

  async getAllGroups(): Promise<MonitoredGroup[]> {
    const { data, error } = await this.getSupabase()
      .from('monitored_groups')
      .select('*')
      .order('registered_at', { ascending: false });

    if (error) {
      logger.error('Failed to fetch all groups', error as Error);
      return [];
    }

    return (data || []).map((r: any) => this.mapRow(r));
  }

  async incrementMessageCount(groupId: string): Promise<void> {
    try {
      const { error } = await this.getSupabase().rpc('increment_group_message_count', {
        p_group_id: groupId,
      });

      if (error && error.code !== '42883') {
        logger.debug('Failed to increment message count via RPC', { groupId, error: error.message });
        await this.getSupabase()
          .from('monitored_groups')
          .update({
            message_count: (await this.getMessageCount(groupId)) + 1,
            last_seen_message_at: new Date().toISOString(),
          })
          .eq('group_id', groupId);
      }
    } catch (error) {
      logger.debug('Failed to increment message count', { groupId });
    }
  }

  private async getMessageCount(groupId: string): Promise<number> {
    const { data } = await this.getSupabase()
      .from('monitored_groups')
      .select('message_count')
      .eq('group_id', groupId)
      .single();
    return data?.message_count || 0;
  }

  async refreshCache(): Promise<void> {
    this.cacheLoadedAt = 0;
    await this.loadCache();
  }

  private mapRow(row: any): MonitoredGroup {
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

let groupManagerInstance: GroupManager | null = null;

export function getGroupManager(): GroupManager {
  if (!groupManagerInstance) {
    groupManagerInstance = new GroupManager();
  }
  return groupManagerInstance;
}

export const groupManager = getGroupManager();
export default groupManager;
