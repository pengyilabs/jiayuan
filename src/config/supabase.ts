import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';
import type { Client } from '../data/repositories/supabase';

/** Cliente de Supabase para el navegador (clave `anon` + sesión del usuario). */
export function createBrowserClient(url: string, anonKey: string): Client {
  return createClient<Database>(url, anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
}
