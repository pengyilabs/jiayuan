/**
 * Reglas de validación compartidas entre el navegador y las Edge Functions.
 * Sin dependencias de Deno ni del DOM.
 */

export const USERNAME_PATTERN = /^[a-zA-Z0-9._-]{3,32}$/;
// Validación práctica (no RFC completa): algo@dominio.tld sin espacios.
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 80;

export type PasswordIssue =
  'too_short' | 'too_long' | 'needs_lower' | 'needs_upper' | 'needs_digit' | 'same_as_username';

export const normalizeUsername = (value: string): string => value.trim().toLowerCase();
export const normalizeEmail = (value: string): string => value.trim().toLowerCase();

export const isValidUsername = (value: string): boolean => USERNAME_PATTERN.test(value.trim());
export const isValidEmail = (value: string): boolean =>
  value.length <= 254 && EMAIL_PATTERN.test(value.trim());

/** Devuelve la lista de requisitos incumplidos (vacía si la contraseña es válida). */
export function passwordIssues(password: string, username = ''): PasswordIssue[] {
  const issues: PasswordIssue[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) issues.push('too_short');
  if (password.length > PASSWORD_MAX_LENGTH) issues.push('too_long');
  if (!/[a-z]/.test(password)) issues.push('needs_lower');
  if (!/[A-Z]/.test(password)) issues.push('needs_upper');
  if (!/[0-9]/.test(password)) issues.push('needs_digit');
  if (username && password.toLowerCase() === username.trim().toLowerCase())
    issues.push('same_as_username');
  return issues;
}
