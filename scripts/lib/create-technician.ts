/**
 * Lógica de `create-technician` (la única cuenta de técnico), independiente de Supabase: recibe
 * puertos y devuelve el resultado. A diferencia de `create-admin`, la contraseña SIEMPRE se
 * genera (nunca se puede fijar una propia) y no admite `--force`: si ya existe un técnico, el
 * script se niega — es una cuenta única a propósito.
 */
import {
  isValidEmail,
  isValidUsername,
  normalizeEmail,
  normalizeUsername,
} from '../../supabase/functions/_shared/validation.ts';
import { CliError, generatePassword } from './create-admin.ts';

export { CliError };

export interface TechnicianPorts {
  countTechnicians(): Promise<number>;
  createUser(input: {
    email: string;
    password: string;
    metadata: { username: string; full_name: string; locale: string };
  }): Promise<{ id: string }>;
  setTechnicianRole(userId: string): Promise<void>;
  deleteUser(userId: string): Promise<void>;
  findUserIdByUsername(username: string): Promise<string | null>;
}

export interface CreateTechnicianInput {
  email: string;
  username: string;
  fullName: string;
  locale?: string;
}

export async function createTechnician(
  ports: TechnicianPorts,
  input: CreateTechnicianInput,
): Promise<{ userId: string; username: string; password: string }> {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  if (!isValidEmail(email)) throw new CliError('Correo no válido');
  if (!isValidUsername(username))
    throw new CliError('Usuario no válido (3–32 caracteres: letras, números, . _ -)');
  if (input.fullName.trim() === '') throw new CliError('El nombre es obligatorio');

  if ((await ports.countTechnicians()) > 0) {
    throw new CliError(
      'Ya existe una cuenta de técnico — es única a propósito. ' +
        'Para reemplazarla, desactívala o bórrala directamente en la base de datos primero.',
    );
  }
  if (await ports.findUserIdByUsername(username))
    throw new CliError(`El usuario "${username}" ya existe`);

  // Siempre generada — a diferencia de create-admin, esta cuenta nunca acepta una contraseña
  // elegida por quien ejecuta el script.
  const password = generatePassword(24);

  const { id } = await ports.createUser({
    email,
    password,
    metadata: { username, full_name: input.fullName.trim(), locale: input.locale ?? 'en' },
  });
  try {
    await ports.setTechnicianRole(id);
  } catch (error) {
    await ports.deleteUser(id); // no dejar un usuario a medias
    throw error;
  }
  return { userId: id, username, password };
}
