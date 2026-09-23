#!/usr/bin/env bash
# Aplica migraciones + semillas sobre un PostgreSQL local y ejecuta los tests pgTAP.
#
#   scripts/db-test.sh
#
# La conexión usa las variables estándar de PostgreSQL (PGHOST, PGUSER, PGPASSWORD…).
# Con Supabase CLI y Docker, el equivalente es `supabase db reset && supabase test db`.
set -euo pipefail
cd "$(dirname "$0")/.."

DB_NAME="${DB_NAME:-proppulse_test}"
bash scripts/db-setup.sh
psql_db() { psql -X -q -v ON_ERROR_STOP=1 -d "$DB_NAME" "$@"; }

run_suite() {
  local dir="$1" f out n
  for f in "$dir"/*.test.sql; do
    out="$(psql_db -At -f "$f" 2>&1)" || { echo "✗ $(basename "$f") (error SQL)"; echo "$out" | grep -v '^ok ' | tail -15; status=1; continue; }
    if grep -Eq '^not ok|^# Looks like you failed|^# Looks like you planned' <<<"$out"; then
      echo "✗ $(basename "$f")"; echo "$out" | grep -E -A4 '^not ok|^# Looks like'; status=1
    else
      n="$(grep -Ec '^ok ' <<<"$out")"
      echo "✓ $(basename "$f") ($n aserciones)"
    fi
  done
}

status=0
echo "→ Tests pgTAP (reglas, RLS, RPC, storage)"
run_suite supabase/tests/database

echo "→ Semilla de demostración + verificación"
psql_db -f supabase/seed.demo.sql
run_suite supabase/tests/demo
exit $status
