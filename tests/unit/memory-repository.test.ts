import { describe, expect, it } from 'vitest';
import { createMemoryRepositories } from '../../src/data/repositories/memory';
import { LIMING_ID } from '../../src/data/seed/users';
import { RepositoryError } from '../../src/data/repositories/types';

describe('repositorio en memoria', () => {
  it('la ventana de "deshacer" caduca (la reloj es inyectable)', async () => {
    let now = new Date('2026-09-21T15:00:00Z');
    const repos = createMemoryRepositories({ now: () => now });

    const pending = (await repos.posts.list()).find(p => p.status === 'pending');
    if (!pending) throw new Error('la semilla debe incluir posts pendientes');
    await repos.posts.approve(pending.id);
    const audit = await repos.posts.latestAudit(pending.id);
    if (!audit) throw new Error('sin auditoría');

    now = new Date(now.getTime() + 9_000); // la ventana por defecto es de 8 s
    await expect(repos.posts.undo(audit.id)).rejects.toMatchObject({ kind: 'undo_unavailable' });
  });

  it('un empleado solo ve sus posts y no puede aprobar', async () => {
    const repos = createMemoryRepositories({ currentUserId: LIMING_ID });
    const posts = await repos.posts.list();
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every(p => p.authorId === LIMING_ID)).toBe(true);

    const pending = posts.find(p => p.status === 'pending');
    if (!pending) throw new Error('sin posts pendientes');
    const error = await repos.posts.approve(pending.id).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(RepositoryError);
    expect((error as RepositoryError).kind).toBe('forbidden');
  });
});
