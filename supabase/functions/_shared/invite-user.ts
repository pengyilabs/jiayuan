/**
 * Invitaciones. Solo administradores (con MFA verificado si es obligatorio).
 *  · { email, username, fullName, role, locale }  → crea el usuario y envía la invitación.
 *  · { action: "resend", userId }                 → reenvía una invitación pendiente.
 */
import { HttpError, json, readJsonObject, requireAdmin, route, stringField } from './http.ts';
import type { Locale, Role } from './ports.ts';
import {
  NAME_MAX_LENGTH,
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from './validation.ts';

const ROLES: readonly Role[] = ['employee', 'admin'];
const LOCALES: readonly Locale[] = ['zh', 'en', 'fr', 'es'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleInviteUser = route(async (req, deps) => {
  const jwt = await requireAdmin(req, deps);
  const body = await readJsonObject(req);
  const redirectTo = `${deps.config.siteUrl.replace(/\/$/, '')}/accept-invite`;

  // ── Reenvío ───────────────────────────────────────────────────────────────
  if (body.action === 'resend') {
    const userId = stringField(body, 'userId', 36);
    if (!UUID.test(userId)) throw new HttpError(400, 'invalid_request');
    const record = await deps.directory.findById(userId);
    if (!record) throw new HttpError(404, 'not_found');
    if (record.confirmed) throw new HttpError(409, 'already_accepted');

    const result = await deps.auth.invite(
      record.email,
      { username: record.username, full_name: record.fullName, locale: record.locale },
      redirectTo,
    );
    if (!result.ok) throw new HttpError(502, 'server_error');
    return json(req, deps.config, 200, { ok: true });
  }

  // ── Invitación nueva ──────────────────────────────────────────────────────
  const email = normalizeEmail(stringField(body, 'email', 254));
  const username = normalizeUsername(stringField(body, 'username', 32));
  const fullName = stringField(body, 'fullName', NAME_MAX_LENGTH).trim();
  const role = body.role;
  const locale = body.locale;

  if (!isValidEmail(email)) throw new HttpError(400, 'invalid_email');
  if (!isValidUsername(username)) throw new HttpError(400, 'invalid_username');
  if (fullName.length === 0) throw new HttpError(400, 'invalid_request');
  if (!ROLES.includes(role as Role) || !LOCALES.includes(locale as Locale)) {
    throw new HttpError(400, 'invalid_request');
  }

  if (await deps.directory.findByUsername(username)) throw new HttpError(409, 'username_taken');
  if (await deps.directory.findByEmail(email)) throw new HttpError(409, 'email_taken');

  const invited = await deps.auth.invite(
    email,
    { username, full_name: fullName, locale: locale as Locale },
    redirectTo,
  );
  if (!invited.ok)
    throw new HttpError(
      invited.reason === 'email_exists' ? 409 : 502,
      invited.reason === 'email_exists' ? 'email_taken' : 'server_error',
    );

  // El trigger de la base de datos añade un sufijo si el usuario ya existía (carrera): se detecta y se revierte.
  const created = await deps.directory.findById(invited.userId);
  if (!created || created.username !== username) {
    await deps.auth.deleteUser(invited.userId);
    throw new HttpError(409, 'username_taken');
  }

  // El rol se asigna con la identidad de quien invita (RPC set_user_role): queda sujeto a RLS y MFA.
  if (role === 'admin' && !(await deps.caller.setRole(jwt, invited.userId, 'admin'))) {
    await deps.auth.deleteUser(invited.userId);
    throw new HttpError(500, 'role_assignment_failed');
  }

  return json(req, deps.config, 201, {
    user: { id: invited.userId, email, username, fullName, role },
  });
});
