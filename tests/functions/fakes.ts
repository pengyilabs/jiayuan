import type {
  AuthDeps,
  DirectoryRecord,
  InviteResult,
  PasswordSignInResult,
  Role,
} from '../../supabase/functions/_shared/ports.ts';

export const ORIGIN = 'https://app.example.test';

export const record = (overrides: Partial<DirectoryRecord> = {}): DirectoryRecord => ({
  id: '00000000-0000-4000-8000-0000000000a2',
  email: 'liming@example.test',
  username: 'liming',
  fullName: '李明',
  locale: 'zh',
  role: 'employee',
  active: true,
  confirmed: true,
  ...overrides,
});

export interface Fake {
  deps: AuthDeps;
  users: DirectoryRecord[];
  passwords: Map<string, string>;
  attempts: { key: string; ip: string | null; success: boolean }[];
  calls: string[];
  adminJwts: Set<string>;
  banned: Set<string>;
  overrides: {
    signIn?: PasswordSignInResult;
    invite?: InviteResult;
    setRoleOk?: boolean;
    renameOnCreate?: string;
  };
}

/** Doble en memoria de todos los puertos, con registro de las llamadas efectuadas. */
export function createFake(initial: DirectoryRecord[] = [record()]): Fake {
  const users = [...initial];
  const passwords = new Map<string, string>(users.map(u => [u.email, 'Correct-Horse-9']));
  const attempts: Fake['attempts'] = [];
  const calls: string[] = [];
  const adminJwts = new Set<string>(['admin-jwt']);
  const banned = new Set<string>();
  const overrides: Fake['overrides'] = {};
  let seq = 100;

  const deps: AuthDeps = {
    directory: {
      findByUsername: u => Promise.resolve(users.find(x => x.username === u) ?? null),
      findByEmail: e => Promise.resolve(users.find(x => x.email === e) ?? null),
      findById: id => Promise.resolve(users.find(x => x.id === id) ?? null),
      signInAllowed(key) {
        const failures = attempts.filter(a => a.key === key && !a.success).length;
        return Promise.resolve(failures < 5);
      },
      recordAttempt(key, ip, success) {
        attempts.push({ key, ip, success });
        return Promise.resolve();
      },
    },
    auth: {
      passwordSignIn(email, password) {
        if (overrides.signIn) return Promise.resolve(overrides.signIn);
        if (passwords.get(email) !== password)
          return Promise.resolve({ ok: false, reason: 'invalid_credentials' });
        return Promise.resolve({
          ok: true,
          tokens: {
            access_token: 'access',
            refresh_token: 'refresh',
            expires_in: 3600,
            token_type: 'bearer',
          },
        });
      },
      revokeSession() {
        calls.push('revokeSession');
        return Promise.resolve();
      },
      invite(email, metadata, redirectTo) {
        calls.push(`invite:${email}:${redirectTo}`);
        if (overrides.invite) return Promise.resolve(overrides.invite);
        const id = `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`;
        users.push(
          record({
            id,
            email,
            username: overrides.renameOnCreate ?? metadata.username,
            fullName: metadata.full_name,
            locale: metadata.locale,
            confirmed: false,
          }),
        );
        return Promise.resolve({ ok: true, userId: id });
      },
      deleteUser(userId) {
        calls.push(`deleteUser:${userId}`);
        const i = users.findIndex(u => u.id === userId);
        if (i >= 0) users.splice(i, 1);
        return Promise.resolve();
      },
      setBanned(userId, isBanned) {
        if (isBanned) banned.add(userId);
        else banned.delete(userId);
        return Promise.resolve();
      },
      sendRecovery(email, redirectTo) {
        calls.push(`recovery:${email}:${redirectTo}`);
        return Promise.resolve();
      },
    },
    caller: {
      isAdmin: jwt => Promise.resolve(adminJwts.has(jwt)),
      setRole(_jwt: string, userId: string, role: Role) {
        calls.push(`setRole:${userId}:${role}`);
        return Promise.resolve(overrides.setRoleOk ?? true);
      },
    },
    config: { siteUrl: `${ORIGIN}/`, allowedOrigins: [ORIGIN] },
  };

  return { deps, users, passwords, attempts, calls, adminJwts, banned, overrides };
}

export const post = (body: unknown, headers: Record<string, string> = {}): Request =>
  new Request('https://functions.example.test/fn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
