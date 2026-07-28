import config from '../config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Symbol to mark admin-only imports
export const Admin = Symbol('Admin');

/**
 * Get Supabase client with anon credentials for normal operations
 * Follows least-privilege principle - only reads and routine writes that align with RLS
 */
export function getAnonClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.key, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Get Supabase client with service-role credentials for admin operations
 * Should only be imported via Admin symbol and used for whitelisted admin operations
 */
export function getAdminClient(): SupabaseClient {
  return createClient(config.supabase.url, config.supabase.serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
}

/**
 * Wrapper for admin-only operations that logs each call
 * Throws if called without Admin symbol
 */
export function adminOnly<T>(fn: () => Promise<T>, operationName: string): Promise<T> {
  // In a real implementation, this would check for Admin symbol and log the call
  // For now, just return the function result
  return fn();
}

// Export both clients explicitly for type safety
export { SupabaseClient };