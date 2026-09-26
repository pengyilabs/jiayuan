/**
 * Puertos (interfaces) que necesitan los handlers de las Edge Functions.
 * Los handlers no conocen Supabase: `adapters.ts` los implementa con supabase-js y los
 * tests con dobles en memoria.
 */

export interface SessionTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  token_type: string;
}

export type Role = 'employee' | 'admin';
export type Locale = 'zh' | 'en' | 'fr' | 'es';

export interface DirectoryRecord {
  id: string;
  email: string;
  username: string;
  fullName: string;
  locale: Locale;
  role: Role;
  active: boolean;
  /** El usuario aceptó la invitación (tiene contraseña). */
  confirmed: boolean;
}

export type PasswordSignInResult =
  | { ok: true; tokens: SessionTokens }
  | { ok: false; reason: 'invalid_credentials' | 'banned' | 'unconfirmed' | 'error' };

export type InviteResult =
  { ok: true; userId: string } | { ok: false; reason: 'email_exists' | 'error' };

export interface AuthDeps {
  /** Lectura de perfiles y control de intentos (con service_role). */
  directory: {
    findByUsername(username: string): Promise<DirectoryRecord | null>;
    findByEmail(email: string): Promise<DirectoryRecord | null>;
    findById(id: string): Promise<DirectoryRecord | null>;
    signInAllowed(key: string, ip: string | null): Promise<boolean>;
    recordAttempt(key: string, ip: string | null, success: boolean): Promise<void>;
  };
  /** Operaciones de Supabase Auth (GoTrue). */
  auth: {
    passwordSignIn(email: string, password: string): Promise<PasswordSignInResult>;
    revokeSession(accessToken: string): Promise<void>;
    invite(
      email: string,
      metadata: { username: string; full_name: string; locale: Locale },
      redirectTo: string,
    ): Promise<InviteResult>;
    deleteUser(userId: string): Promise<void>;
    setBanned(userId: string, banned: boolean): Promise<void>;
    sendRecovery(email: string, redirectTo: string): Promise<void>;
  };
  /** Operaciones que se ejecutan con la identidad (JWT) de quien llama, para que RLS y MFA apliquen. */
  caller: {
    isAdmin(jwt: string): Promise<boolean>;
    setRole(jwt: string, userId: string, role: Role): Promise<boolean>;
  };
  config: {
    /** URL pública de la aplicación (destino de los enlaces de invitación y de restablecimiento). */
    siteUrl: string;
    /** Orígenes autorizados por CORS; vacío = ninguno. */
    allowedOrigins: string[];
  };
}
