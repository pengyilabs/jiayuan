#!/usr/bin/env bash
# Recrea una base de datos de pruebas: emulación de Supabase + migraciones + catálogo + utilidades.
# La conexión se configura con las variables estándar de PostgreSQL (PGHOST, PGUSER, PGPASSWORD…).
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-proppulse_test}"
export PGOPTIONS="${PGOPTIONS:--c client_min_messages=warning}"
psql_admin() { psql -X -q -v ON_ERROR_STOP=1 -d postgres "$@"; }
psql_db() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB_NAME" "$@"; }

echo "→ Recreando base de datos $DB_NAME"
psql_admin -c "drop database if exists $DB_NAME with (force)" -c "create database $DB_NAME"
psql_db -c "alter database $DB_NAME set search_path to public, extensions"

echo "→ Emulación de Supabase"
psql_db -f supabase/tests/support/supabase_shim.sql

echo "→ Migraciones"
for f in supabase/migrations/*.sql; do
  echo "   $(basename "$f")"
  psql_db -f "$f"
done

echo "→ Catálogo (seed.sql) y utilidades de test"
psql_db -f supabase/seed.sql
psql_db -f supabase/tests/support/helpers.sql
