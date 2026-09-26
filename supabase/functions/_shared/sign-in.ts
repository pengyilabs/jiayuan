/**
 * Inicio de sesión por nombre de usuario.
 *
 * Supabase Auth autentica con correo; la resolución usuario → correo se hace en el servidor
 * para no exponer correos ni permitir enumeración de usuarios (todas las credenciales
 * incorrectas devuelven el mismo error), y para limitar los intentos de fuerza bruta.
 */
import { HttpError, clientIp, json, readJsonObject, route, stringField } from './http.ts';
import { normalizeUsername, PASSWORD_MAX_LENGTH } from './validation.ts';

export const handleSignIn = route(async (req, deps) => {
  const body = await readJsonObject(req);
  const identifier = normalizeUsername(stringField(body, 'username', 254));
  const password = stringField(body, 'password', PASSWORD_MAX_LENGTH);
  const ip = clientIp(req);

  if (!(await deps.directory.signInAllowed(identifier, ip))) {
    throw new HttpError(429, 'too_many_attempts', { 'Retry-After': '900' });
  }

  const record = identifier.includes('@')
    ? await deps.directory.findByEmail(identifier)
    : await deps.directory.findByUsername(identifier);

  if (!record) {
    await deps.directory.recordAttempt(identifier, ip, false);
    throw new HttpError(401, 'invalid_credentials');
  }

  const result = await deps.auth.passwordSignIn(record.email, password);
  if (!result.ok) {
    if (result.reason === 'error') throw new HttpError(502, 'server_error');
    if (result.reason === 'banned') throw new HttpError(403, 'account_disabled');
    await deps.directory.recordAttempt(identifier, ip, false);
    throw new HttpError(401, 'invalid_credentials');
  }

  // Cuenta desactivada con la contraseña correcta: no se entrega la sesión.
  if (!record.active) {
    await deps.auth.revokeSession(result.tokens.access_token);
    throw new HttpError(403, 'account_disabled');
  }

  await deps.directory.recordAttempt(identifier, ip, true);
  const { access_token, refresh_token, expires_in, expires_at, token_type } = result.tokens;
  return json(req, deps.config, 200, {
    access_token,
    refresh_token,
    expires_in,
    expires_at,
    token_type,
  });
});
