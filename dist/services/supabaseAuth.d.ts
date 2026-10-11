export interface SessionKeyFile {
    name: string;
    content: string;
}
export declare class SupabaseSessionStore {
    private client;
    private clientId;
    constructor(clientId?: string, supabaseUrl?: string, serviceRoleKey?: string);
    sessionExists(options: {
        session: string;
    }): Promise<boolean>;
    extract(options: {
        session: string;
        path: string;
    }): Promise<void>;
    save(options: {
        session: string;
    }): Promise<void>;
    delete(options: {
        session: string;
    }): Promise<void>;
    private readKeyFiles;
}
//# sourceMappingURL=supabaseAuth.d.ts.map