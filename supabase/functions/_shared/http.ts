import type { AuthDeps } from './ports.ts';

export type ErrorCode =
  | 'invalid_request'
  | 'invalid_credentials'
  | 'too_many_attempts'
  | 'account_disabled'
  | 'forbidden'
  | 'unauthenticated'
  | 'username_taken'
  | 'email_taken'
  | 'already_accepted'
  | 'invalid_username'
  | 'invalid_email'
  | 'not_found'
  | 'role_assignment_failed'
  | 'server_error';

const MAX_BODY_BYTES = 4096;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    readonly headers: Record<string, string> = {},
  ) {
    super(code);
  }
}

/** Refleja el origen solo si está en la lista de autorizados. */
export function corsHeaders(req: Request, config: AuthDeps['config']): Record<string, string> {
  const origin = req.headers.get('origin');
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  };
  if (origin && config.allowedOrigins.includes(origin))
    headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

export function json(
  req: Request,
  config: AuthDeps['config'],
  status: number,
  body: unknown,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(req, config),
      ...extra,
    },
  });
}

export const errorResponse = (
  req: Request,
  config: AuthDeps['config'],
  error: HttpError,
): Response => json(req, config, error.status, { error: { code: error.code } }, error.headers);

/** Envuelve un handler: CORS, método, errores controlados y errores inesperados (sin filtrar detalles). */
export function route(
  handler: (req: Request, deps: AuthDeps) => Promise<Response>,
): (req: Request, deps: AuthDeps) => Promise<Response> {
  return async (req, deps) => {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(req, deps.config) });
    }
    try {
      if (req.method !== 'POST') throw new HttpError(405, 'invalid_request');
      return await handler(req, deps);
    } catch (error) {
      if (error instanceof HttpError) return errorResponse(req, deps.config, error);
      console.error('Error inesperado en la función:', error);
      return errorResponse(req, deps.config, new HttpError(500, 'server_error'));
    }
  };
}

export async function readJsonObject(req: Request): Promise<Record<string, unknown>> {
  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, 'invalid_request');
  try {
    const value: unknown = JSON.parse(text);
    if (value && typeof value === 'object' && !Array.isArray(value))
      return value as Record<string, unknown>;
  } catch {
    // cae al error de abajo
  }
  throw new HttpError(400, 'invalid_request');
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

export function clientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.headers.get('cf-connecting-ip') || null;
}

export function stringField(body: Record<string, unknown>, name: string, max: number): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length === 0 || value.length > max) {
    throw new HttpError(400, 'invalid_request');
  }
  return value;
}

/** Exige una sesión de administrador (con MFA verificado si la organización lo exige). */
export async function requireAdmin(req: Request, deps: AuthDeps): Promise<string> {
  const jwt = bearerToken(req);
  if (!jwt) throw new HttpError(401, 'unauthenticated');
  if (!(await deps.caller.isAdmin(jwt))) throw new HttpError(403, 'forbidden');
  return jwt;
}
