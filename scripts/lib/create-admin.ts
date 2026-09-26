/**
 * Lógica de `create-admin` (primer administrador y recuperación de MFA), independiente de
 * Supabase: recibe puertos y devuelve el resultado. El envoltorio de línea de comandos
 * (scripts/create-admin.ts) los conecta con la API de administración.
 */
import { randomInt } from 'node:crypto';
import {
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
  passwordIssues,
} from '../../supabase/functions/_shared/validation.ts';

export interface AdminPorts {
  countActiveAdmins(): Promise<number>;
  createUser(input: {
    email: string;
    password: string;
    metadata: { username: string; full_name: string; locale: string };
  }): Promise<{ id: string }>;
  setAdminRole(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  findUserIdByUsername(username: string): Promise<string | null>;
  listFactorIds(userId: string): Promise<string[]>;
  deleteFactor(userId: string, factorId: string): Promise<void>;
}

export class CliError extends Error {}

export interface CreateAdminInput {
  email: string;
  username: string;
  fullName: string;
  locale?: string;
  password?: string;
  /** Permite crear un administrador aunque ya exista alguno. */
  force?: boolean;
}

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const ALL = LOWER + UPPER + DIGITS + '-_.!';

/** Contraseña aleatoria de 20 caracteres que cumple la política (con CSPRNG). */
export function generatePassword(length = 20): string {
  const pick = (set: string): string => set[randomInt(set.length)] ?? '';
  const chars = [pick(LOWER), pick(UPPER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j] ?? '', chars[i] ?? ''];
  }
  return chars.join('');
}

export async function createFirstAdmin(
  ports: AdminPorts,
  input: CreateAdminInput,
): Promise<{ userId: string; username: string; password: string; generated: boolean }> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  if (!isValidEmail(email)) throw new CliError('Correo no válido');
  if (!isValidUsername(username))
    throw new CliError('Usuario no válido (3–32 caracteres: letras, números, . _ -)');
  if (input.fullName.trim() === '') throw new CliError('El nombre es obligatorio');

  const generated = !input.password;
  const password = input.password ?? generatePassword();
  const issues = passwordIssues(password, username);
  if (issues.length > 0)
    throw new CliError(`La contraseña no cumple la política: ${issues.join(', ')}`);

  if (!input.force && (await ports.countActiveAdmins()) > 0) {
    throw new CliError(
      'Ya existe un administrador. Invita a nuevos miembros desde Settings → Team (o usa --force).',
    );
  }
  if (await ports.findUserIdByUsername(username))
    throw new CliError(`El usuario "${username}" ya existe`);

  const { id } = await ports.createUser({
    email,
    password,
    metadata: { username, full_name: input.fullName.trim(), locale: input.locale ?? 'en' },
  });
  try {
    await ports.setAdminRole(id);
  } catch (error) {
    await ports.deleteUser(id); // no dejar un usuario a medias
    throw error;
  }
  return { userId: id, username, password, generated };
}

/** Elimina los factores TOTP de un usuario (recuperación si perdió su autenticador). */
export async function resetMfa(ports: AdminPorts, usernameInput: string): Promise<number> {
  const username = normalizeUsername(usernameInput);
  const userId = await ports.findUserIdByUsername(username);
  if (!userId) throw new CliError(`No existe el usuario "${username}"`);
  const factors = await ports.listFactorIds(userId);
  for (const factorId of factors) await ports.deleteFactor(userId, factorId);
  return factors.length;
}
