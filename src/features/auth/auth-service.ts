/**
 * Contrato de autenticación. La interfaz no conoce Supabase: `supabase-auth.ts` y
 * `memory-auth.ts` (modo demo) lo implementan.
 */

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'too_many_attempts'
  | 'account_disabled'
  | 'not_a_member'
  | 'password_weak'
  | 'password_same'
  | 'code_invalid'
  | 'network'
  | 'unknown';

export class AuthError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    cause?: unknown,
  ) {
    super(code, { cause });
    this.name = 'AuthError';
  }
}

/** Nivel de garantía: aal1 = contraseña; aal2 = contraseña + segundo factor (TOTP). */
export type Assurance = 'aal1' | 'aal2';

/** Cómo se llegó a la aplicación: enlace de invitación, de restablecimiento o inicio normal. */
export type EntryFlow = 'invite' | 'recovery' | null;

export interface AuthInit {
  /** Hay una sesión válida. */
  signedIn: boolean;
  flow: EntryFlow;
  /** Se abrió un enlace de invitación/restablecimiento caducado o inválido. */
  linkError: boolean;
}

export interface TotpEnrollment {
  factorId: string;
  /** Imagen del código QR (data URL SVG). */
  qrCode: string;
  /** Clave para introducir manualmente. */
  secret: string;
}

export interface AuthService {
  /** Procesa el enlace de la URL (si lo hay) y recupera la sesión guardada. */
  init(): Promise<AuthInit>;
  /** Id del usuario con sesión, o `null`. Es síncrono: lo usan los repositorios en memoria. */
  currentUserId(): string | null;
  signIn(username: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Define la contraseña del usuario con sesión (aceptar invitación / restablecer). */
  setPassword(password: string): Promise<void>;
  /** Solicita el correo de restablecimiento; nunca revela si la cuenta existe. */
  requestPasswordReset(identifier: string): Promise<void>;
  /** Se invoca cuando la sesión termina fuera de la interfaz (caducidad, revocación). */
  onSignedOut(callback: () => void): () => void;
  mfa: {
    assurance(): Promise<{ current: Assurance; next: Assurance }>;
    /** Id del factor TOTP verificado del usuario, o `null` si aún no configuró ninguno. */
    verifiedFactorId(): Promise<string | null>;
    enroll(): Promise<TotpEnrollment>;
    /** Comprueba un código TOTP (sirve para activar el factor y para iniciar sesión). */
    verify(factorId: string, code: string): Promise<void>;
  };
}
