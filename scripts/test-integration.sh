#!/usr/bin/env bash
# Ejecuta el contrato de repositorios contra Supabase "real" (Postgres + RLS + PostgREST)
# sin Docker: PostgreSQL local + binario de PostgREST + proxy /rest/v1.
#
# Requisitos: PostgreSQL con pgTAP/pgcrypto/citext, PostgREST (POSTGREST_BIN) y variables PG*.
# Con Supabase CLI y Docker, en su lugar:
#   supabase start && SUPABASE_TEST_URL=<API URL> SUPABASE_TEST_JWT_SECRET=<JWT secret> npm test
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-proppulse_test}"
POSTGREST_BIN="${POSTGREST_BIN:-postgrest}"
JWT_SECRET="${JWT_SECRET:-test-secret-test-secret-test-secret-1234}"
PGRST_PORT="${PGRST_PORT:-3001}"
PROXY_PORT="${PROXY_PORT:-54399}"
DB_HOST="${PGHOST:-127.0.0.1}"

bash scripts/db-setup.sh
psql -X -q -v ON_ERROR_STOP=1 -d "$DB_NAME" -f supabase/seed.demo.sql

echo "→ Iniciando PostgREST y el proxy"
PGRST_DB_URI="postgres://authenticator:authenticator@${DB_HOST}:${PGSQL_PORT:-5432}/${DB_NAME}" \
PGRST_DB_SCHEMAS="public" PGRST_DB_EXTRA_SEARCH_PATH="public,extensions" PGRST_DB_ANON_ROLE="anon" PGRST_JWT_SECRET="$JWT_SECRET" \
PGRST_SERVER_HOST="127.0.0.1" PGRST_SERVER_PORT="$PGRST_PORT" \
  "$POSTGREST_BIN" >/tmp/postgrest.log 2>&1 &
PGRST_PID=$!
node scripts/rest-proxy.mjs "$PROXY_PORT" "$PGRST_PORT" >/tmp/rest-proxy.log 2>&1 &
PROXY_PID=$!
trap 'kill $PGRST_PID $PROXY_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  curl -fs "http://127.0.0.1:${PGRST_PORT}/" >/dev/null 2>&1 && break
  sleep 0.5
done
curl -fs "http://127.0.0.1:${PGRST_PORT}/" >/dev/null || { echo "PostgREST no arrancó:"; cat /tmp/postgrest.log; exit 1; }

echo "→ Contrato de repositorios y adaptadores de funciones (Supabase)"
SUPABASE_TEST_URL="http://127.0.0.1:${PROXY_PORT}" SUPABASE_TEST_JWT_SECRET="$JWT_SECRET" \
  npx vitest run tests/contract/supabase.test.ts tests/contract/functions-adapters.test.ts
