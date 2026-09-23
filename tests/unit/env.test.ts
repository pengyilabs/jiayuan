import { describe, expect, it } from 'vitest';
import { ConfigError, readConfig } from '../../src/config/env';

const jwt = (payload: object): string =>
  `${btoa('{"alg":"HS256"}')}.${btoa(JSON.stringify(payload))}.signature`;

describe('readConfig', () => {
  it('usa datos en memoria por defecto', () => {
    expect(readConfig({})).toEqual({ dataSource: 'memory' });
    expect(readConfig({ VITE_DATA_SOURCE: 'memory' })).toEqual({ dataSource: 'memory' });
  });

  it('con supabase exige URL y clave anon', () => {
    expect(() => readConfig({ VITE_DATA_SOURCE: 'supabase' })).toThrow(ConfigError);
    expect(() =>
      readConfig({ VITE_DATA_SOURCE: 'supabase', VITE_SUPABASE_URL: 'https://x.supabase.co' }),
    ).toThrow(/VITE_SUPABASE_ANON_KEY/);
  });

  it('valida la URL y el valor de VITE_DATA_SOURCE', () => {
    expect(() =>
      readConfig({
        VITE_DATA_SOURCE: 'supabase',
        VITE_SUPABASE_URL: 'no es url',
        VITE_SUPABASE_ANON_KEY: 'k',
      }),
    ).toThrow(/URL válida/);
    expect(() => readConfig({ VITE_DATA_SOURCE: 'firebase' })).toThrow(/memory/);
  });

  it('acepta una configuración completa', () => {
    const key = jwt({ role: 'anon' });
    expect(
      readConfig({
        VITE_DATA_SOURCE: 'supabase',
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: key,
      }),
    ).toEqual({ dataSource: 'supabase', supabase: { url: 'https://x.supabase.co', anonKey: key } });
  });

  it('rechaza una clave service_role en el navegador', () => {
    expect(() =>
      readConfig({
        VITE_DATA_SOURCE: 'supabase',
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: jwt({ role: 'service_role' }),
      }),
    ).toThrow(/service_role/);
  });
});
