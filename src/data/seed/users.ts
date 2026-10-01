/** Usuarios de demostración (solo desarrollo). En SQL se crean en auth.users (seed.demo.sql). */
export interface DemoUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'admin' | 'employee' | 'technician';
  locale: 'zh' | 'en' | 'fr' | 'es';
}

export const ADMIN_ID = '00000000-0000-4000-8000-0000000000a1';
export const LIMING_ID = '00000000-0000-4000-8000-0000000000a2';
export const WANGFANG_ID = '00000000-0000-4000-8000-0000000000a3';

export const demoUsersSeed: DemoUser[] = [
  {
    id: ADMIN_ID,
    email: 'zhuyan@homedirect.ca',
    username: 'zhuyan',
    fullName: '朱晏',
    role: 'admin',
    locale: 'zh',
  },
  {
    id: LIMING_ID,
    email: 'liming@homedirect.ca',
    username: 'liming',
    fullName: '李明',
    role: 'employee',
    locale: 'zh',
  },
  {
    id: WANGFANG_ID,
    email: 'wangfang@homedirect.ca',
    username: 'wangfang',
    fullName: '王芳',
    role: 'employee',
    locale: 'zh',
  },
];

/** Contraseña de los usuarios demo en local (nunca en producción). */
export const DEMO_PASSWORD = 'demo-password-123';

/**
 * Técnico (F11): cuenta única con acceso a todo (equivalente a admin + el panel de operaciones,
 * ver `docs/ROLES.md`). A propósito NO forma parte de `demoUsersSeed`: nunca se incluye en
 * `seed.demo.sql` (Supabase) ni aparece en el panel de cuentas del login — solo existe en el
 * directorio en memoria de este entorno local. En un despliegue real (Supabase) se crea con
 * `npm run technician:create`, que genera una contraseña aleatoria distinta en cada instalación.
 */
export const TECHNICIAN_ID = '00000000-0000-4000-8000-0000000000f1';
export const technicianSeed: DemoUser = {
  id: TECHNICIAN_ID,
  email: 'tech@homedirect.local',
  username: 'root_tech',
  fullName: 'Técnico de plataforma',
  role: 'technician',
  locale: 'en',
};
/** Únicamente para correr este proyecto en local — ver la nota de arriba. */
export const TECHNICIAN_PASSWORD = 'Tk9$vQ2!mR7x&Lp4#Zc8';
