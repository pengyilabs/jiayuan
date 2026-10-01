/**
 * Home móvil de agente (F10): reproduce el diseño adjunto (mobile-feed.html) con datos reales.
 * Solo corre en el proyecto `mobile` (ver playwright.config.ts): a otro ancho el feed no existe.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';
import { useEnglish } from './helpers';

const DEMO_PASSWORD = 'demo-password-123';

async function loginAsAgent(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[name="username"]').fill('liming');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#mobile-agent-feed')).toBeVisible();
  await useEnglish(page);
}

test('el agente ve el feed estilo app; el admin sigue con el calendario habitual', async ({
  page,
}) => {
  await loginAsAgent(page);
  await expect(
    page.locator('#mobile-agent-feed .m-post-card, #mobile-agent-feed .m-feed-tpl'),
  ).not.toHaveCount(0);
  await expect(page.locator('.home-layout')).toBeHidden();

  await page.locator('#user-logout').evaluate(b => (b as HTMLElement).click());
  await page.goto('/');
  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('.home-layout')).toBeVisible();
  await expect(page.locator('#mobile-agent-feed')).toBeHidden();
});

test('el ciclo de idioma, las notificaciones reales y "Post" (formulario real) funcionan', async ({
  page,
}) => {
  await loginAsAgent(page);

  const langBtn = page.locator('#m-lang-cycle');
  const before = await langBtn.textContent();
  await langBtn.click();
  await expect(langBtn).not.toHaveText(before ?? '');

  await page.locator('#mobile-agent-feed .notif-btn').click();
  await expect(page.locator('#mobile-agent-feed .notif-dropdown')).toHaveClass(/open/);
  await page.locator('#mobile-agent-feed .notif-btn').click();

  await page.locator('#mobile-agent-feed [data-action="mobile-feed:open-create"]').click();
  await expect(page.locator('#m-sheet-overlay')).toHaveClass(/m-open/);
  const box = await page.locator('#m-create-sheet').boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual((page.viewportSize()?.width ?? 0) - 1);
  await page.locator('#m-sheet-close').click();
  await expect(page.locator('#m-sheet-overlay')).not.toHaveClass(/m-open/);
});

test('la pestaña "Listings" navega a la página real, con sus propios permisos de rol', async ({
  page,
}) => {
  await loginAsAgent(page);
  await page.locator('[data-action="mobile-feed:tab"][data-tab="listings"]').click();
  await expect(page.locator('#page-listings')).toHaveClass(/active/);
  await expect(page.locator('[data-role-note="listings"]')).toContainText(/agent|agente/i);
});

test('sin desbordes horizontales en el feed móvil de agente', async ({ page }) => {
  await loginAsAgent(page);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
});

test('la hoja de creación en 3 pasos crea posts reales (F10.1), igual que la referencia', async ({
  page,
}) => {
  await loginAsAgent(page);
  const before = await page.locator('#m-feed .m-post-card, #m-feed .m-feed-tpl').count();

  await page.locator('[data-action="mobile-feed:open-create"]').click();
  await expect(page.locator('.m-step-title')).toContainText(/listing/i);

  // Paso 1: propiedad (deshabilitado hasta elegir una).
  await expect(page.locator('[data-action="mobile-wizard:next"]')).toBeDisabled();
  await page.locator('[data-action="mobile-wizard:pick-listing"]').first().click();
  await expect(page.locator('[data-action="mobile-wizard:next"]')).toBeEnabled();
  await page.locator('[data-action="mobile-wizard:next"]').click();

  // Paso 2: plataformas (deshabilitado hasta elegir al menos una).
  await expect(page.locator('.m-step-title')).toContainText(/platform/i);
  await expect(page.locator('[data-action="mobile-wizard:next"]')).toBeDisabled();
  await page.locator('[data-action="mobile-wizard:toggle-platform"][data-id="facebook"]').click();
  await expect(page.locator('[data-action="mobile-wizard:next"]')).toBeEnabled();
  await page.locator('[data-action="mobile-wizard:next"]').click();

  // Paso 3: formato + plantilla real (con foto y precio reales, no un diseño inventado).
  await expect(page.locator('.m-step-title')).toContainText(/template/i);
  await expect(page.locator('.m-tpl-card').first()).toBeVisible();
  await page.locator('.m-tpl-card').first().click();
  await expect(page.locator('.m-tpl-card.m-selected .tpl-preview')).toBeVisible();

  await page.locator('[data-action="mobile-wizard:confirm"]').click();
  await expect(page.locator('#m-sheet-overlay')).not.toHaveClass(/m-open/);
  await expect(page.locator('#m-feed .m-post-card, #m-feed .m-feed-tpl')).toHaveCount(before + 1);
});
