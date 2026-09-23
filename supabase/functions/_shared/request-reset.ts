/**
 * Restablecimiento de contraseña por usuario o correo.
 * Responde siempre lo mismo exista o no la cuenta (sin enumeración de usuarios).
 */
import { HttpError, clientIp, json, readJsonObject, route, stringField } from './http.ts';
import { normalizeUsername } from './validation.ts';

export const handleRequestReset = route(async (req, deps) => {
  const body = await readJsonObject(req);
  const identifier = normalizeUsername(stringField(body, 'identifier', 254));
  const ip = clientIp(req);
  const key = `reset:${identifier}`;

  if (!(await deps.directory.signInAllowed(key, ip))) {
    throw new HttpError(429, 'too_many_attempts', { 'Retry-After': '900' });
  }
  // Cada solicitud cuenta como intento: limita el envío de correos a una misma cuenta.
  await deps.directory.recordAttempt(key, ip, false);

  const record = identifier.includes('@')
    ? await deps.directory.findByEmail(identifier)
    : await deps.directory.findByUsername(identifier);

  if (record?.active && record.confirmed) {
    await deps.auth.sendRecovery(
      record.email,
      `${deps.config.siteUrl.replace(/\/$/, '')}/reset-password`,
    );
  }
  return json(req, deps.config, 200, { ok: true });
});
