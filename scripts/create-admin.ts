/**
 * Crea el PRIMER administrador (los demás usuarios se invitan desde Settings → Team) o
 * restablece el TOTP de un usuario que perdió su autenticador.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:create -- \
 *     --email zhuyan@homedirect.ca --username zhuyan --name "朱晏" [--locale zh]
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:create -- --reset-mfa --username zhuyan
 *
 * La contraseña se toma de ADMIN_PASSWORD; si no existe, se genera una aleatoria y se muestra
 * UNA sola vez. Evita `--password` en la línea de comandos (queda en el historial del shell).
 * La clave service_role da acceso total: úsala solo desde tu equipo, nunca en el navegador.
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { CliError, createFirstAdmin, resetMfa } from './lib/create-admin.ts';
import type { AdminPorts } from './lib/create-admin.ts';
import type { Database } from '../src/types/database';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    username: { type: 'string' },
    name: { type: 'string' },
    locale: { type: 'string' },
    password: { type: 'string' },
    force: { type: 'boolean', default: false },
    'reset-mfa': { type: 'boolean', default: false },
  },
});

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Define SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const client = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ports: AdminPorts = {
  async countActiveAdmins() {
    const { count, error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);
    if (error) throw new Error(error.message);
    return count ?? 0;
  },
  async createUser({ email, password, metadata }) {
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) throw new Error(error.message);
    return { id: data.user.id };
  },
  async setAdminRole(userId) {
    // service_role omite RLS y los privilegios de columna: es el único camino para el primer admin.
    const { error } = await client.from('profiles').update({ role: 'admin' }).eq('id', userId);
    if (error) throw new Error(error.message);
  },
  async deleteUser(userId) {
    await client.auth.admin.deleteUser(userId);
  },
  async findUserIdByUsername(username) {
    const { data, error } = await client
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.id ?? null;
  },
  async listFactorIds(userId) {
    const { data, error } = await client.auth.admin.mfa.listFactors({ userId });
    if (error) throw new Error(error.message);
    return data.factors.map(f => f.id);
  },
  async deleteFactor(userId, factorId) {
    const { error } = await client.auth.admin.mfa.deleteFactor({ userId, id: factorId });
    if (error) throw new Error(error.message);
  },
};

try {
  if (values['reset-mfa']) {
    if (!values.username) throw new CliError('Indica --username');
    const removed = await resetMfa(ports, values.username);
    console.log(
      `Factores TOTP eliminados: ${String(removed)}. En el próximo login deberá configurarlo de nuevo.`,
    );
  } else {
    if (!values.email || !values.username || !values.name) {
      throw new CliError('Indica --email, --username y --name');
    }
    const result = await createFirstAdmin(ports, {
      email: values.email,
      username: values.username,
      fullName: values.name,
      ...(values.locale ? { locale: values.locale } : {}),
      ...((values.password ?? process.env.ADMIN_PASSWORD)
        ? { password: values.password ?? process.env.ADMIN_PASSWORD }
        : {}),
      force: values.force,
    });
    console.log(`Administrador creado: ${result.username} (${result.userId})`);
    if (result.generated) {
      console.log(
        `Contraseña generada (guárdala ahora; no se volverá a mostrar): ${result.password}`,
      );
    }
    console.log(
      'En el primer inicio de sesión deberá configurar la verificación en dos pasos (TOTP).',
    );
  }
} catch (error) {
  console.error(error instanceof CliError ? `Error: ${error.message}` : error);
  process.exit(1);
}
