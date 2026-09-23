/** Usuarios de demostración (solo desarrollo). En SQL se crean en auth.users (seed.demo.sql). */
export interface DemoUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: 'admin' | 'employee';
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
