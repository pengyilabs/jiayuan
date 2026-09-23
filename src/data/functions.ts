import type { Client } from './repositories/supabase';

/** Invoca una Edge Function con un resultado tipado (`error` como `unknown`). */
export async function invokeFunction<T = unknown>(
  client: Client,
  name: string,
  body: unknown,
): Promise<{ data: T | null; error: unknown }> {
  const result = await client.functions.invoke<T>(name, { body: body as Record<string, unknown> });
  return { data: (result.data ?? null) as T | null, error: result.error as unknown };
}
