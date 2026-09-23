/**
 * Sincroniza el acceso a Supabase Auth con `profiles.active` (la fuente de verdad).
 * Al desactivar se bloquea al usuario (no puede renovar tokens); al reactivar se desbloquea.
 * El cliente no indica el estado deseado: se lee de la base de datos.
 */
import { HttpError, json, readJsonObject, requireAdmin, route, stringField } from './http.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleSyncUserAccess = route(async (req, deps) => {
  await requireAdmin(req, deps);
  const body = await readJsonObject(req);
  const userId = stringField(body, 'userId', 36);
  if (!UUID.test(userId)) throw new HttpError(400, 'invalid_request');

  const record = await deps.directory.findById(userId);
  if (!record) throw new HttpError(404, 'not_found');

  await deps.auth.setBanned(userId, !record.active);
  return json(req, deps.config, 200, { ok: true, banned: !record.active });
});
