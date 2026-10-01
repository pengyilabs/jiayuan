/**
 * Sesión persistente (F9a): tras iniciar sesión en modo demo, cerrar la pestaña y abrir otra en
 * el mismo navegador mantiene la sesión abierta (localStorage, 7 días o hasta cerrar sesión).
 */
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-password-123';

test('la sesión sigue abierta al cerrar la pestaña y volver a abrirla', async ({ context }) => {
  const first = await context.newPage();
  await first.goto('/');
  await first.locator('input[name="username"]').fill('liming');
  await first.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await first.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(first.locator('.sidebar')).toBeVisible();
  await first.close(); // cerrar la pestaña

  const reopened = await context.newPage(); // mismo navegador, pestaña nueva
  await reopened.goto('/');
  await expect(reopened.locator('.sidebar')).toBeVisible();
  await expect(reopened.locator('form[data-form="login"]')).toHaveCount(0);

  await reopened.locator('#user-logout').evaluate(b => (b as HTMLElement).click());
  const afterLogout = await context.newPage();
  await afterLogout.goto('/');
  await expect(afterLogout.locator('form[data-form="login"]')).toBeVisible();
});

test('el login muestra la nota de que la sesión persiste', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.auth-persist')).toContainText(
    /stay signed in|sigues|persiste|reste/i,
  );
});
