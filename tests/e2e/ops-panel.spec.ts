/**
 * Panel de operaciones del técnico (F11): la única pantalla de esa cuenta, con datos reales.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { useEnglish } from './helpers';

const TECHNICIAN_USERNAME = 'root_tech';
const TECHNICIAN_PASSWORD = 'Tk9$vQ2!mR7x&Lp4#Zc8';
const DEMO_PASSWORD = 'demo-password-123';

async function loginAsTechnician(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[name="username"]').fill(TECHNICIAN_USERNAME);
  await page.locator('input[name="password"]').fill(TECHNICIAN_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/ops$/);
  await useEnglish(page);
}

test('el técnico aterriza en /ops, es su única pantalla, y el resto de rutas lo devuelven ahí', async ({
  page,
}) => {
  await loginAsTechnician(page);
  await expect(page.locator('#page-ops')).toHaveClass(/active/);
  await expect(page.locator('.topbar .role-badge')).toContainText('Technician');

  for (const path of ['/', '/listings', '/templates', '/approvals', '/settings']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/ops$/);
  }
});

test('el técnico no aparece en el login demo, y el admin no puede entrar a /ops', async ({
  page,
}) => {
  await page.goto('/');
  const demoUsers = await page.locator('[data-demo-user]').allTextContents();
  expect(demoUsers.join(' ')).not.toContain(TECHNICIAN_USERNAME);

  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('.sidebar')).toBeVisible();
  await expect(page.locator('[data-od-id="nav-ops"]')).toBeHidden();

  await page.goto('/ops');
  await expect(page).not.toHaveURL(/\/ops$/);
});

test('la tabla de cuentas administra el equipo real, y ajustes/sistema funcionan de verdad', async ({
  page,
}) => {
  await loginAsTechnician(page);

  const agentRow = page.locator('tr[data-account]', { hasText: '@liming' });
  await expect(agentRow.locator('.badge')).toHaveText('Active');
  await agentRow.locator('[data-action="ops:toggle"]').click();
  await expect(agentRow.locator('.badge')).toHaveText('Deactivated');
  await agentRow.locator('[data-action="ops:toggle"]').click(); // se deja como estaba
  await expect(agentRow.locator('.badge')).toHaveText('Active');

  const techRow = page.locator('tr[data-account]', { hasText: '@root_tech' });
  await expect(techRow.locator('select, button')).toHaveCount(0);
  await expect(techRow).toContainText('Single account');

  await page.locator('[data-action="ops:tab"][data-tab="settings"]').click();
  await page.locator('#ops-undo-window').fill('22');
  await page.locator('#ops-settings-form button[type="submit"]').click();
  await expect(page.locator('#ops-settings-saved')).toBeVisible();
  await page.reload();
  await page.locator('[data-action="ops:tab"][data-tab="settings"]').click();
  await expect(page.locator('#ops-undo-window')).toHaveValue('22');

  await page.locator('[data-action="ops:tab"][data-tab="system"]').click();
  await expect(page.locator('#ops-system-grid')).toContainText('memory');
});
