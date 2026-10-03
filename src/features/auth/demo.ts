/** Credenciales por defecto de los despliegues demo (modo `memory`): nunca existen en producción. */
import { DEMO_PASSWORD, demoUsersSeed } from '../../data/seed/users';
import type { UserRole } from '../../types/models';

export interface DemoAccount {
  username: string;
  fullName: string;
  role: UserRole;
}

export interface DemoInfo {
  password: string;
  accounts: DemoAccount[];
}

export function buildDemoInfo(): DemoInfo {
  return {
    password: DEMO_PASSWORD,
    accounts: demoUsersSeed.map(u => ({
      username: u.username,
      fullName: u.fullName,
      role: u.role,
    })),
  };
}
