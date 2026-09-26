/**
 * Contrato de comportamiento de los repositorios. Se ejecuta contra la implementación en
 * memoria y contra Supabase (PostgREST + RLS reales): si una diverge, el test falla.
 *
 * Parte de la semilla de demostración; las pruebas que modifican datos crean sus propios posts.
 */
import { describe, expect, it } from 'vitest';
import { ADMIN_ID, LIMING_ID, WANGFANG_ID } from '../../src/data/seed/users';
import { RepositoryError } from '../../src/data/repositories/types';
import type { Repositories, RepositoryErrorKind } from '../../src/data/repositories/types';
import type { PostDraft } from '../../src/types/models';

export type RepositoriesFor = (userId: string) => Repositories;

async function expectKind(promise: Promise<unknown>, kind: RepositoryErrorKind): Promise<void> {
  const error: unknown = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(error, `se esperaba RepositoryError(${kind})`).toBeInstanceOf(RepositoryError);
  expect((error as RepositoryError).kind).toBe(kind);
}

const draft = (title: string, overrides: Partial<PostDraft> = {}): PostDraft => ({
  listingId: 1,
  platformId: 'facebook',
  title,
  description: 'Descripción',
  hashtags: '#test',
  lang: 'English',
  scheduledAt: '2026-10-05T13:00:00.000Z',
  ...overrides,
});

export function defineRepositoryContract(name: string, repositoriesFor: RepositoriesFor): void {
  const admin = (): Repositories => repositoriesFor(ADMIN_ID);
  const liming = (): Repositories => repositoriesFor(LIMING_ID);
  const wangfang = (): Repositories => repositoriesFor(WANGFANG_ID);

  describe(`contrato de repositorios · ${name}`, () => {
    describe('visibilidad', () => {
      it('el administrador ve todos los posts; cada empleado, solo los suyos', async () => {
        const all = await admin().posts.list();
        const mine = await liming().posts.list();
        const theirs = await wangfang().posts.list();

        expect(all.length).toBeGreaterThanOrEqual(17);
        expect(mine.length).toBeGreaterThan(0);
        expect(mine.every(p => p.authorId === LIMING_ID)).toBe(true);
        expect(theirs.every(p => p.authorId === WANGFANG_ID)).toBe(true);
        expect(mine.length + theirs.length).toBeLessThan(all.length + 1);
      });

      it('los posts incluyen autor, día en la zona de la organización e imágenes', async () => {
        const post = (await liming().posts.list()).find(p => p.id === 1);
        expect(post).toMatchObject({
          authorName: '李明',
          date: '2026-08-22',
          status: 'published',
          price: '$850,000',
        });
        expect(post?.images.length).toBeGreaterThan(0);
      });

      it('el perfil actual y la lista de perfiles respetan el rol', async () => {
        expect((await liming().profiles.current())?.fullName).toBe('李明');
        expect((await admin().profiles.current())?.role).toBe('admin');
        expect(await admin().profiles.list()).toHaveLength(3);
        expect((await liming().profiles.list()).map(p => p.id)).toEqual([LIMING_ID]);
      });
    });

    describe('catálogo', () => {
      it('todos los miembros leen propiedades, plataformas, templates y configuración', async () => {
        const repos = liming();
        expect(await repos.listings.list()).toHaveLength(6);
        const platforms = await repos.catalog.platforms();
        expect(platforms).toHaveLength(9);
        expect(platforms.reduce((n, p) => n + p.postTypes.length, 0)).toBe(34);
        expect(Object.keys(await repos.catalog.postTypeGroups())).toHaveLength(8);
        expect(await repos.catalog.templates()).toHaveLength(12);
        expect((await repos.catalog.settings()).timezone).toBe('America/Toronto');
      });

      it('las propiedades tienen textos traducibles, precio numérico y fotos ordenadas', async () => {
        const listing = (await liming().listings.list())[0];
        expect(listing).toMatchObject({
          id: 1,
          price: 850000,
          areaSqft: 1200,
          propertyType: 'apartment',
        });
        expect(listing?.title).toMatchObject({ en: 'Downtown Luxury Condo', zh: '市中心豪华公寓' });
        expect(listing?.photos[0]).toBe('images/listings/condo1.jpg');
      });

      it('solo el administrador edita propiedades', async () => {
        await expectKind(liming().listings.update(1, { price: 1 }), 'forbidden');

        const original = (await admin().listings.list())[0];
        if (!original) throw new Error('sin propiedades');
        try {
          const updated = await admin().listings.update(1, {
            price: 777000,
            title: { ...original.title, en: 'Renamed' },
          });
          expect(updated.price).toBe(777000);
          expect(updated.title.en).toBe('Renamed');
          expect(updated.title.zh).toBe(original.title.zh);
          expect((await liming().listings.list())[0]?.price).toBe(777000);
        } finally {
          await admin().listings.update(1, { price: original.price, title: original.title });
        }
      });
    });

    describe('flujo de un post', () => {
      it('borrador → pendiente → aprobado → publicado, con permisos por rol', async () => {
        const created = await liming().posts.create(draft('Flujo completo'));
        expect(created).toMatchObject({
          status: 'draft',
          authorId: LIMING_ID,
          authorName: '李明',
          date: '2026-10-05',
        });

        // Otro empleado no lo ve ni lo puede editar.
        expect((await wangfang().posts.list()).some(p => p.id === created.id)).toBe(false);
        await expectKind(wangfang().posts.update(created.id, { title: 'hack' }), 'forbidden');
        await expectKind(wangfang().posts.submit(created.id), 'forbidden');

        // El autor edita y envía a aprobación.
        expect((await liming().posts.update(created.id, { title: 'Flujo editado' })).title).toBe(
          'Flujo editado',
        );
        expect((await liming().posts.submit(created.id)).status).toBe('pending');
        await expectKind(liming().posts.submit(created.id), 'invalid_state');
        await expectKind(liming().posts.update(created.id, { title: 'ya no' }), 'forbidden');

        // Un empleado no puede aprobar (ni su propio post); el administrador sí.
        await expectKind(liming().posts.approve(created.id), 'forbidden');
        expect((await admin().posts.approve(created.id)).status).toBe('approved');
        await expectKind(admin().posts.approve(created.id), 'invalid_state');

        await expectKind(liming().posts.markPublished(created.id), 'forbidden');
        expect(
          (await admin().posts.markPublished(created.id, 'https://example.test/p')).status,
        ).toBe('published');
      });

      it('rechazar exige motivo; el autor lo ve, reabre y reenvía', async () => {
        const created = await liming().posts.create(draft('Será rechazado'));
        await liming().posts.submit(created.id);

        await expectKind(admin().posts.reject(created.id, '   '), 'invalid_input');
        await expectKind(liming().posts.reject(created.id, 'no puedo'), 'forbidden');
        const rejected = await admin().posts.reject(created.id, 'Faltan fotos');
        expect(rejected).toMatchObject({ status: 'rejected', rejectionReason: 'Faltan fotos' });

        expect((await liming().posts.reopen(created.id)).status).toBe('draft');
        expect((await liming().posts.submit(created.id)).status).toBe('pending');
        expect((await liming().posts.withdraw(created.id)).status).toBe('draft');
      });

      it('borrado lógico y restauración', async () => {
        const created = await liming().posts.create(draft('Para borrar'));
        expect((await liming().posts.softDelete(created.id)).deleted).toBe(true);
        expect((await liming().posts.list()).some(p => p.id === created.id)).toBe(false);
        await expectKind(liming().posts.softDelete(created.id), 'invalid_state');

        expect((await liming().posts.restore(created.id)).deleted).toBe(false);
        expect((await liming().posts.list()).some(p => p.id === created.id)).toBe(true);

        // Un empleado no elimina posts que ya están en aprobación.
        await liming().posts.submit(created.id);
        await expectKind(liming().posts.softDelete(created.id), 'forbidden');
      });
    });

    describe('notificaciones', () => {
      it('solicitar, aprobar y rechazar generan notificaciones a quien corresponde', async () => {
        const created = await liming().posts.create(draft('Con notificaciones'));
        await liming().posts.submit(created.id);
        const adminNotifs = await admin().notifications.list();
        expect(adminNotifs[0]).toMatchObject({ type: 'post_pending', postId: created.id });

        await admin().posts.approve(created.id);
        const authorNotifs = await liming().notifications.list();
        expect(authorNotifs[0]).toMatchObject({
          type: 'post_approved',
          postId: created.id,
          readAt: null,
        });

        await admin().notifications.markRead(adminNotifs[0]?.id ?? -1);
        const afterRead = await admin().notifications.list();
        expect(afterRead.find(n => n.id === adminNotifs[0]?.id)?.readAt).not.toBeNull();
      });
    });

    describe('deshacer', () => {
      it('revierte la última acción y no permite repetirla', async () => {
        const created = await liming().posts.create(draft('Deshacer'));
        await liming().posts.submit(created.id);
        const approved = await admin().posts.approve(created.id);
        expect(approved.status).toBe('approved');

        const audit = await admin().posts.latestAudit(created.id);
        expect(audit).toMatchObject({ action: 'approved', undone: false });
        if (!audit) throw new Error('sin auditoría');

        const undone = await admin().posts.undo(audit.id);
        expect(undone.status).toBe('pending');
        expect((await admin().posts.latestAudit(created.id))?.action).toBe('undo');
        await expectKind(admin().posts.undo(audit.id), 'invalid_state');
      });

      it('un empleado no puede deshacer una acción del administrador', async () => {
        const created = await liming().posts.create(draft('Ajeno'));
        await liming().posts.submit(created.id);
        await admin().posts.approve(created.id);
        const audit = await admin().posts.latestAudit(created.id);
        if (!audit) throw new Error('sin auditoría');
        await expectKind(liming().posts.undo(audit.id), 'forbidden');
      });

      it('solo se puede deshacer la última acción', async () => {
        const created = await liming().posts.create(draft('Pila'));
        await liming().posts.submit(created.id);
        await admin().posts.approve(created.id);
        const approvedAudit = await admin().posts.latestAudit(created.id);
        await admin().posts.markPublished(created.id);
        if (!approvedAudit) throw new Error('sin auditoría');
        await expectKind(admin().posts.undo(approvedAudit.id), 'undo_unavailable');
      });
    });

    describe('usuarios', () => {
      it('cada persona actualiza su propio perfil; el estado se deriva de la invitación', async () => {
        const before = await liming().profiles.current();
        expect(before).toMatchObject({ email: 'liming@homedirect.ca', status: 'active' });
        expect((await liming().profiles.updateSelf({ locale: 'fr' })).locale).toBe('fr');
        expect((await liming().profiles.current())?.locale).toBe('fr');
        await liming().profiles.updateSelf({ locale: before?.locale ?? 'zh' });
      });

      it('solo el administrador cambia roles; el último administrador está protegido', async () => {
        await expectKind(liming().profiles.setRole(LIMING_ID, 'admin'), 'forbidden');
        await expectKind(liming().profiles.setActive(WANGFANG_ID, false), 'forbidden');
        await expectKind(admin().profiles.setRole(ADMIN_ID, 'employee'), 'invalid_state');
        await expectKind(admin().profiles.setActive(ADMIN_ID, false), 'invalid_state');

        const promoted = await admin().profiles.setRole(WANGFANG_ID, 'admin');
        expect(promoted.role).toBe('admin');
        expect((await admin().profiles.setRole(WANGFANG_ID, 'employee')).role).toBe('employee');
      });
    });
  });
}
