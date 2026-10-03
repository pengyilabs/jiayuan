/**
 * Crea la ÚNICA cuenta de técnico (rol admin-equivalente + panel de operaciones exclusivo,
 * F11). Nunca se siembra por código ni por SQL: es deliberadamente la única forma de crearla.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run technician:create -- \
 *     --email tech@tuempresa.com --username root_tech --name "Nombre" [--locale es]
 *
 * La contraseña SIEMPRE se genera al azar (24 caracteres) y se muestra UNA sola vez — no hay
 * forma de elegirla por línea de comandos ni por variable de entorno. Si ya existe un técnico,
 * el script se niega (no admite --force): es una cuenta única a propósito. La clave
 * service_role da acceso total: úsala solo desde tu equipo, nunca en el navegador.
 */
import { createClient } from '@supabase/supabase-js';
import { parseArgs } from 'node:util';
import { CliError, createTechnician } from './lib/create-technician.ts';
import type { TechnicianPorts } from './lib/create-technician.ts';
import type { Database } from '../src/types/database';

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    username: { type: 'string' },
    name: { type: 'string' },
    locale: { type: 'string' },
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

const ports: TechnicianPorts = {
  async countTechnicians() {
    const { count, error } = await client
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'technician');
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
  async setTechnicianRole(userId) {
    // service_role omite RLS y los privilegios de columna: es el único camino para crear esta
    // cuenta (set_user_role, el RPC normal, rechaza a propósito el rol "technician").
    const { error } = await client.from('profiles').update({ role: 'technician' }).eq('id', userId);
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
};

try {
  if (!values.email || !values.username || !values.name) {
    throw new CliError('Indica --email, --username y --name');
  }
  const result = await createTechnician(ports, {
    email: values.email,
    username: values.username,
    fullName: values.name,
    ...(values.locale ? { locale: values.locale } : {}),
  });
  console.log(`Técnico creado: ${result.username} (${result.userId})`);
  console.log(`Contraseña generada (guárdala ahora; no se volverá a mostrar): ${result.password}`);
  console.log(
    'En el primer inicio de sesión deberá configurar la verificación en dos pasos (TOTP), igual que un administrador.',
  );
} catch (error) {
  console.error(error instanceof CliError ? `Error: ${error.message}` : error);
  process.exit(1);
}
