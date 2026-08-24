import { SupabaseClient } from '@supabase/supabase-js';
export declare const Admin: unique symbol;
export declare function getAnonClient(): SupabaseClient;
export declare function getAdminClient(): SupabaseClient;
export declare function adminOnly<T>(fn: () => Promise<T>, operationName: string): Promise<T>;
export { SupabaseClient };
//# sourceMappingURL=supabaseClients.d.ts.map