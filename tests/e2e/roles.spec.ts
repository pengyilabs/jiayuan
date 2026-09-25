/**
 * F8 — E2E por rol: la historia completa que pide el plan como criterio de aceptación.
 *   Empleado: crea un post y solicita su aprobación.
 *   Admin: lo ve pendiente, lo aprueba (con confirmación reforzada), lo deshace, y filtra por
 *   estado para encontrarlo de nuevo.
 * Las piezas sueltas ya se prueban en smoke.spec.ts; este archivo las encadena como un único
 * recorrido para cada rol, tal como lo describe el criterio de aceptación de F8.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-password-123';
const POST_TITLE = `Publicación E2E ${Date.now().toString()}`;

async function login(page: Page, username: string): Promise<void> {
  await page.goto('/');
  await page.locator('input[name="username"]').fill(username);
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#sidebar')).toBeVisible();
}

test('el empleado crea un post con una imagen y solicita su aprobación', async ({ page }) => {
  await login(page, 'liming');

  await page.locator('[data-action="post:new"]').first().click();
  await expect(page.locator('#modal-post')).toHaveClass(/open/);

  await page.locator('#post-title').fill(POST_TITLE);
  await page.locator('#post-platform-checks input[data-id="facebook"]').check();
  await expect(page.locator('[data-od-id="post-row-facebook"]')).toBeVisible();

  await page
    .locator('#post-file-facebook')
    .setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10) });
  await expect(page.locator('.post-media-thumb')).toHaveCount(1);
  await page.locator('#post-schedule').fill('2026-12-15T10:00');

  // Solicitar aprobación en vez de guardar borrador: es la acción que cierra el criterio de
  // aceptación ("el empleado crea y solicita").
  await page.locator('#post-submit').click();
  await expect(page.locator('#modal-post')).not.toHaveClass(/open/);
  await expect(page.locator('.toast-success').last()).toContainText('Submitted for approval');

  // Un empleado no tiene cola de aprobación (RLS: solo ve sus propios posts), pero sí debe ver
  // su propio post ya en Home, con el estado reflejado si cambia a la vista de lista.
  await page.locator('[data-action="feed:view"][data-view="list"]').click();
  const row = page.locator('.feed-list-post', { hasText: POST_TITLE });
  await expect(row).toBeVisible();
  await expect(row.locator('.status-badge')).toContainText('Pending');
});

test('el admin ve el pendiente, lo aprueba, lo deshace y lo encuentra filtrando por estado', async ({
  page,
}) => {
  await login(page, 'zhuyan');

  // Lo ve en la cola de aprobaciones (el rol de admin sí ve las de todo el equipo).
  await page.locator('[data-action="nav:go"][data-page="approvals"]').click();
  const approvalCard = page.locator('.approval-card', { hasText: POST_TITLE });
  await expect(approvalCard).toBeVisible();

  await approvalCard.locator('.btn-primary').click();
  const confirmBtn = page.locator('.dialog-overlay.open [data-dialog="confirm"]');
  await expect(confirmBtn).toBeDisabled(); // confirmación reforzada (F3): no es un clic más
  await confirmBtn.click();
  await expect(approvalCard).toBeHidden();
  const toast = page.locator('.toast-success').last();
  await expect(toast).toContainText('Approved');

  // Deshacer: vuelve a pendiente.
  await toast.locator('.toast-undo').click();
  await page.locator('[data-action="nav:go"][data-page="approvals"]').click();
  await expect(page.locator('.approval-card', { hasText: POST_TITLE })).toBeVisible();

  // Filtra por estado en Home para volver a encontrarlo (F6, solo disponible para admin).
  await page.locator('[data-action="nav:go"][data-page="dashboard"]').click();
  await expect(page.locator('#feed-status-filters')).toBeVisible();
  await page.locator('[data-action="feed:status-filter"][data-status="pending"]').click();
  await page.locator('[data-action="feed:view"][data-view="list"]').click();
  await expect(page.locator('.feed-list-post', { hasText: POST_TITLE })).toBeVisible();

  await page.locator('[data-action="feed:status-filter"][data-status="approved"]').click();
  await expect(page.locator('.feed-list-post', { hasText: POST_TITLE })).toHaveCount(0);
});
