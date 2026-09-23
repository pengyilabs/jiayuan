// @vitest-environment node
/**
 * Ejecuta el contrato contra Supabase real (PostgREST + Postgres con RLS).
 * Se omite salvo que se definan SUPABASE_TEST_URL y SUPABASE_TEST_JWT_SECRET
 * (los define scripts/test-integration.sh, o `supabase start` + `supabase status -o env`).
 */
import { createClient } from '@supabase/supabase-js';
import { SignJWT } from 'jose';
import { beforeAll, describe } from 'vitest';
import { createSupabaseRepositories } from '../../src/data/repositories/supabase';
import type { Repositories } from '../../src/data/repositories/types';
import type { Database } from '../../src/types/database';
import { defineRepositoryContract } from './repositories.contract';

const url = process.env.SUPABASE_TEST_URL;
const secret = process.env.SUPABASE_TEST_JWT_SECRET;
const apiKey = process.env.SUPABASE_TEST_API_KEY ?? 'test-anon-key';

if (!url || !secret) {
  describe.skip('contrato de repositorios · supabase (defina SUPABASE_TEST_URL para ejecutarlo)', () =>
    undefined);
} else {
  const tokens = new Map<string, string>();

  const mint = (userId: string): Promise<string> =>
    new SignJWT({ role: 'authenticated', aal: 'aal2' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode(secret));

  const users = [
    '00000000-0000-4000-8000-0000000000a1',
    '00000000-0000-4000-8000-0000000000a2',
    '00000000-0000-4000-8000-0000000000a3',
  ];

  beforeAll(async () => {
    for (const id of users) tokens.set(id, await mint(id));
  });

  const repositoriesFor = (userId: string): Repositories => {
    const token = tokens.get(userId);
    if (!token) throw new Error(`Sin token para ${userId}`);
    const client = createClient<Database>(url, apiKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    return createSupabaseRepositories(client, {
      timeZone: () => 'America/Toronto',
      userId: () => Promise.resolve(userId),
    });
  };

  defineRepositoryContract('supabase', repositoriesFor);
}
