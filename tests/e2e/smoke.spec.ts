import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-password-123';

let pageErrors: Error[] = [];

test.beforeEach(({ page }) => {
  pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error));
});

test.afterEach(() => {
  expect(pageErrors).toEqual([]);
});

/** Inicia sesión como administrador demo (zhuyan) y espera a que la aplicación arranque. */
async function loginAsAdmin(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#sidebar')).toBeVisible();
}

test('el login rechaza credenciales incorrectas y acepta las correctas', async ({ page }) => {
  await page.goto('/');
  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill('incorrecta');
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('.auth-alert')).toContainText('Incorrect username or password.');

  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#sidebar')).toBeVisible();
});

test('un empleado no ve la sección de administración y el router bloquea /approvals', async ({
  page,
}) => {
  await page.goto('/');
  await page.locator('input[name="username"]').fill('liming');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#sidebar')).toBeVisible();
  await expect(page.locator('.nav-item[data-page="approvals"]')).toBeHidden();

  await page.goto('/approvals');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('.toast-message')).toContainText("don't have access");
});

test('Home muestra el feed sin errores de JavaScript', async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.locator('.feed-card')).toHaveCount(17);
  await expect(page.locator('#page-dashboard')).toHaveClass(/active/);
});

test('la navegación usa History API (deep link, atrás y adelante)', async ({ page }) => {
  await loginAsAdmin(page, '/listings');
  await expect(page.locator('#page-listings')).toHaveClass(/active/);
  await expect(page.locator('#page-title')).toHaveText('Listings');

  await page.locator('.nav-item[data-page="settings"]').click();
  await expect(page).toHaveURL(/\/settings$/);
  await expect(page.locator('#page-settings')).toHaveClass(/active/);

  await page.goBack();
  await expect(page).toHaveURL(/\/listings$/);
  await expect(page.locator('#page-listings')).toHaveClass(/active/);
});

test('cambia de idioma y traduce la interfaz', async ({ page }) => {
  await loginAsAdmin(page, '/listings');
  await page.locator('.nav-item[data-page="dashboard"]').click();
  await page.locator('#lang-trigger').click();
  await page.locator('.lang-option[data-lang="fr"]').click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await page.locator('.nav-item[data-page="listings"]').click();
  await expect(page.locator('#page-title')).toHaveText('Annonces');
});

test('abre y guarda un listing, y muestra el fallback de imágenes rotas', async ({ page }) => {
  await loginAsAdmin(page, '/listings');
  await expect(page.locator('.listings-table tbody tr')).toHaveCount(6);
  // Las imágenes no existen en el repo: el manejador declarativo aplica el fondo de reserva.
  await expect(page.locator('.listings-table .listing-thumb').first()).toHaveAttribute(
    'style',
    /surface-warm/,
  );

  await page.locator('.listings-table tbody tr').first().click();
  const modal = page.locator('#modal-listing-detail');
  await expect(modal).toHaveClass(/open/);
  await modal.locator('[data-action="listing:edit"]').click();
  await modal.locator('#edit-price-1').fill('$777,000');
  await modal.locator('[data-action="listing:save"]').click();
  await expect(modal.locator('.detail-info-price')).toHaveText('$777,000');

  await modal.locator('.gallery-close').click();
  await expect(modal).not.toHaveClass(/open/);
  await expect(page.locator('.listings-table .listing-price').first()).toHaveText('$777,000');
});

test('aprobar exige confirmación reforzada y ofrece deshacer', async ({ page }) => {
  await loginAsAdmin(page, '/approvals');
  await expect(page.locator('#approval-badge')).toHaveText('5');
  await page.locator('.approval-actions .btn-primary').first().click();

  const confirmBtn = page.locator('.dialog-overlay.open [data-dialog="confirm"]');
  await expect(confirmBtn).toBeVisible();
  await expect(confirmBtn).toBeDisabled(); // acción permanente: refuerzo antes de habilitarse
  await confirmBtn.click(); // Playwright reintenta solo hasta que deja de estar disabled

  await expect(page.locator('#approval-badge')).toHaveText('4');
  await expect(page.locator('.toast-success .toast-undo')).toBeVisible();
});

test('rechazar exige un motivo y el aviso permite deshacer', async ({ page }) => {
  await loginAsAdmin(page, '/approvals');
  const before = await page.locator('#approval-badge').textContent();

  await page.locator('.approval-actions .btn-danger').first().click();
  const modal = page.locator('#modal-reject');
  await expect(modal).toHaveClass(/open/);

  const confirmBtn = modal.locator('#reject-confirm');
  await expect(confirmBtn).toBeDisabled();
  await confirmBtn.click(); // sin motivo todavía
  await expect(modal.locator('#reject-error')).toBeVisible();
  await expect(modal).toHaveClass(/open/);

  await modal.locator('#reject-reason').fill('No cumple la política de fotos');
  await confirmBtn.click();
  await expect(modal).not.toHaveClass(/open/);

  const toast = page.locator('.toast-success').last();
  await expect(toast).toContainText('Rejected');
  await toast.locator('.toast-undo').click();
  await expect(page.locator('#approval-badge')).toHaveText(before ?? '');
});

test('crea un borrador de post con una plataforma y una imagen', async ({ page }) => {
  await loginAsAdmin(page, '/');
  await page.locator('[data-action="post:new"]').first().click();
  await expect(page.locator('#modal-post')).toHaveClass(/open/);

  await page.locator('#post-title').fill('Publicación de prueba E2E');
  await page.locator('#post-platform-checks input[data-id="facebook"]').check();
  await expect(page.locator('[data-od-id="post-row-facebook"]')).toBeVisible();

  // Sin archivo todavía: el tipo por defecto exige exactamente una imagen.
  await page.locator('#post-save-draft').click();
  await expect(page.locator('#post-row-error-facebook')).toBeVisible();

  await page
    .locator('#post-file-facebook')
    .setInputFiles({ name: 'foto.jpg', mimeType: 'image/jpeg', buffer: Buffer.alloc(10) });
  await expect(page.locator('.post-media-thumb')).toHaveCount(1);

  await page.locator('#post-schedule').fill('2026-12-01T10:00');
  await page.locator('#post-save-draft').click();
  await expect(page.locator('#modal-post')).not.toHaveClass(/open/);
  await expect(page.locator('.toast-success').last()).toContainText('Draft saved');
});

test('el panel de notificaciones se abre, marca como leída y se cierra al hacer clic fuera', async ({
  page,
}) => {
  await loginAsAdmin(page, '/');
  await page.locator('#notif-btn').click();
  await expect(page.locator('#notif-dropdown')).toHaveClass(/open/);

  const firstUnread = page.locator('.notif-item.unread').first();
  if (await firstUnread.isVisible()) {
    await firstUnread.click();
    await expect(firstUnread).not.toHaveClass(/unread/);
  }

  await page.locator('[data-action="notif:mark-all-read"]').click();
  await expect(page.locator('.notif-item.unread')).toHaveCount(0);
  await expect(page.locator('#notif-dot')).toBeHidden();

  await page.locator('.topbar-title').click();
  await expect(page.locator('#notif-dropdown')).not.toHaveClass(/open/);
});
