/**
 * F8 — Accesibilidad: auditoría estructural con axe-core sobre el DOM ya montado.
 * jsdom no calcula diseño real ni color, así que se excluyen las reglas que dependen de eso
 * (contraste, tamaño de objetivo táctil): esas se cubren en `tests/e2e/a11y.spec.ts` con un
 * navegador real. Aquí se comprueba la estructura: encabezados, etiquetas de formulario, roles
 * ARIA, `alt` en imágenes, nombres accesibles de los controles, duplicidad de ids, etc.
 */
import axe from 'axe-core';
import { beforeAll, describe, expect, it } from 'vitest';
import { auth, repos } from '../../src/app/services';
import { DEMO_PASSWORD } from '../../src/data/seed/users';

const $ = <T extends HTMLElement = HTMLElement>(selector: string): T => {
  const el = document.querySelector<T>(selector);
  if (!el) throw new Error(`No existe ${selector}`);
  return el;
};

const RULES_UNRELIABLE_IN_JSDOM = [
  'color-contrast', // necesita el color ya renderizado
  'target-size', // necesita el tamaño en pantalla ya calculado
  'scrollable-region-focusable', // depende de overflow calculado por el motor de layout
];

async function auditActiveDom(): Promise<axe.Result[]> {
  const results = await axe.run(document, {
    rules: Object.fromEntries(RULES_UNRELIABLE_IN_JSDOM.map(id => [id, { enabled: false }])),
  });
  return results.violations;
}

function describeViolations(violations: axe.Result[]): string {
  return violations
    .map(
      v =>
        `[${v.id}] ${v.help} (${String(v.nodes.length)} elemento/s): ${v.nodes[0]?.target.join(' ')}`,
    )
    .join('\n');
}

beforeAll(async () => {
  document.title = '加园地产团队 — PropPulse'; // jsdom no carga index.html; el título real sí existe
  document.body.innerHTML = '<div id="root"></div>';
  await auth.signIn('zhuyan', DEMO_PASSWORD);
  await repos.profiles.updateSelf({ locale: 'en' });
  const { bootstrap } = await import('../../src/app/bootstrap');
  await bootstrap($('#root'));
});

describe('accesibilidad estructural (axe-core sobre jsdom)', () => {
  it('Home no tiene violaciones estructurales', async () => {
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
  }, 15000);

  it('el formulario de nuevo post no tiene violaciones estructurales', async () => {
    $('[data-action="post:new"]').click();
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
    $('[data-action="post:close"]').click();
  });

  it('Listings y Templates tampoco', async () => {
    $('[data-action="nav:go"][data-page="listings"]').click();
    let violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);

    $('[data-action="nav:go"][data-page="templates"]').click();
    violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
  }, 15000);

  it('el panel de notificaciones abierto no tiene violaciones', async () => {
    $('[data-action="nav:go"][data-page="dashboard"]').click();
    $('.dash-header .notif-btn').click();
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
    $('.dash-header .notif-btn').click();
  });

  it('el detalle de un listing no tiene violaciones', async () => {
    $('[data-action="listing:open"]').click();
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
    $('[data-action="modal:close"][data-modal="modal-listing-detail"]').click();
  });

  it('la vista previa de un template no tiene violaciones', async () => {
    $('[data-action="nav:go"][data-page="templates"]').click();
    $('[data-action="template:preview"]').click();
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
    $('[data-action="modal:close"][data-modal="modal-template-preview"]').click();
  });

  it('Aprobaciones y Ajustes (solo admin) no tienen violaciones', async () => {
    $('[data-action="nav:go"][data-page="approvals"]').click();
    let violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);

    $('[data-action="nav:go"][data-page="settings"]').click();
    violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
  }, 15000);

  it('el modal de invitar a un miembro del equipo no tiene violaciones', async () => {
    $('[data-action="team:invite-open"]').click();
    const violations = await auditActiveDom();
    expect(violations.length, describeViolations(violations)).toBe(0);
  });
});
