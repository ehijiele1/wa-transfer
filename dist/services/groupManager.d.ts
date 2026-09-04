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
export declare const TRIGGER_MESSAGE = "WATM Good Afternoon";
export declare class GroupManager {
    private inMemoryCache;
    private cacheLoadedAt;
    private readonly CACHE_TTL_MS;
    private getSupabase;
    private loadCache;
    isTriggerMessage(text: string | null | undefined): boolean;
    isMonitored(groupId: string): boolean;
    isMonitoredAsync(groupId: string): Promise<boolean>;
    registerGroup(groupId: string, groupName?: string | null, registeredBy?: string | null): Promise<RegisterGroupResult>;
    private registerGroupDirect;
    unregisterGroup(groupId: string): Promise<boolean>;
    getActiveGroups(): Promise<MonitoredGroup[]>;
    getAllGroups(): Promise<MonitoredGroup[]>;
    incrementMessageCount(groupId: string): Promise<void>;
    private getMessageCount;
    refreshCache(): Promise<void>;
    private mapRow;
}
export declare function getGroupManager(): GroupManager;
export declare const groupManager: GroupManager;
export default groupManager;
//# sourceMappingURL=groupManager.d.ts.map