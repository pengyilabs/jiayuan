import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: [
      'tests/unit/**/*.test.ts',
      'tests/contract/**/*.test.ts',
      'tests/functions/**/*.test.ts',
    ],
    // El contrato contra Supabase comparte una base de datos: se ejecuta en serie.
    fileParallelism: false,
    coverage: { provider: 'v8', include: ['src/**/*.ts'] },
  },
});
