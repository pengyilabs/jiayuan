/**
 * F8 — Accesibilidad con un navegador real. `tests/unit/accessibility.test.ts` ya cubre la
 * estructura (encabezados, etiquetas, ARIA) contra jsdom; aquí, con Chromium de verdad, se
 * añaden las reglas que necesitan diseño renderizado de verdad: contraste de color y tamaño de
 * los objetivos táctiles — precisamente las que se excluyeron de la auditoría en jsdom.
 */
import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-password-123';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#sidebar')).toBeVisible();
}

async function expectNoViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const summary = results.violations
    .map(v => `[${v.id}] ${v.help}: ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
    .join('\n');
  expect(results.violations, summary).toEqual([]);
}

test('la pantalla de login no tiene violaciones WCAG 2 A/AA', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('input[name="username"]')).toBeVisible();
  await expectNoViolations(page);
});

test('Home no tiene violaciones WCAG 2 A/AA (incluye contraste real)', async ({ page }) => {
  await loginAsAdmin(page);
  await expectNoViolations(page);
});

test('el formulario de posts y el calendario no tienen violaciones', async ({ page }) => {
  await loginAsAdmin(page);
  await page.locator('[data-action="post:new"]').first().click();
  await expect(page.locator('#modal-post')).toHaveClass(/open/);
  await expectNoViolations(page);
});

test('los objetivos táctiles miden al menos 44×44px en móvil', async ({ page }) => {
  const width = page.viewportSize()?.width ?? 1280;
  test.skip(width >= 640, 'el mínimo de 44px solo se exige en el punto de corte móvil (F7)');

  await loginAsAdmin(page);
  const targets = ['.notif-btn', '.mobile-menu-btn', '[data-action="post:new"]'];
  for (const selector of targets) {
    const box = await page.locator(selector).first().boundingBox();
    if (!box) continue;
    expect(box.width, selector).toBeGreaterThanOrEqual(44);
    expect(box.height, selector).toBeGreaterThanOrEqual(44);
  }
});
