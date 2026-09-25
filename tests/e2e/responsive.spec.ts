/**
 * F7 — Responsive: los tres layouts (móvil <640px, tablet 640–1023px, PC ≥1024px), verificados
 * con los tres proyectos de Playwright (`desktop`, `tablet`, `mobile`; ver playwright.config.ts).
 * Las aserciones se adaptan al viewport real de cada proyecto en vez de repetir el archivo tres
 * veces, y todas comparten la comprobación de que no hay desborde horizontal.
 */
import type { Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const DEMO_PASSWORD = 'demo-password-123';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('input[name="username"]').fill('zhuyan');
  await page.locator('input[name="password"]').fill(DEMO_PASSWORD);
  await page.locator('form[data-form="login"] button[type="submit"]').click();
  await expect(page.locator('#content')).toBeVisible();
}

/** Ningún elemento debe hacer que la página necesite scroll horizontal. */
async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(false);
}

function breakpointOf(width: number): 'mobile' | 'tablet' | 'desktop' {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

test('Home, Listings y el formulario de posts no desbordan horizontalmente', async ({ page }) => {
  await loginAsAdmin(page);
  await expectNoHorizontalOverflow(page);

  await page.locator('[data-action="nav:go"][data-page="listings"]').click();
  await expect(page.locator('#page-listings')).toHaveClass(/active/);
  await expectNoHorizontalOverflow(page);

  await page.locator('[data-action="post:new"]').first().click();
  await expect(page.locator('#modal-post')).toHaveClass(/open/);
  await expectNoHorizontalOverflow(page);
});

test('el sidebar se comporta según el tamaño (cajón en móvil, rail en tablet, expansible en PC)', async ({
  page,
}) => {
  await loginAsAdmin(page);
  const width = page.viewportSize()?.width ?? 1280;
  const breakpoint = breakpointOf(width);
  const sidebar = page.locator('.sidebar');

  if (breakpoint === 'mobile') {
    // Cerrado por defecto (cajón), sin ocupar espacio en el documento.
    await expect(sidebar).toHaveClass(/collapsed/);
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeLessThan(0); // fuera de pantalla a la izquierda

    await page.locator('.mobile-menu-btn').first().click();
    await expect(sidebar).not.toHaveClass(/collapsed/);
    await expect(page.locator('.sidebar-overlay')).toBeVisible();

    await page.locator('.sidebar-overlay').click({ position: { x: 5, y: 5 } });
    await expect(sidebar).toHaveClass(/collapsed/);
  } else if (breakpoint === 'tablet') {
    const box = await sidebar.boundingBox();
    expect(box?.width).toBeCloseTo(60, 0);
    await expect(page.locator('.sidebar-toggle')).toBeHidden();
  } else {
    // PC: el botón interno de la sidebar puede expandirla/contraerla.
    const before = await sidebar.boundingBox();
    await page.locator('.sidebar-toggle').click();
    const after = await sidebar.boundingBox();
    expect(after?.width).not.toBeCloseTo(before?.width ?? 0, 0);
  }
  await expectNoHorizontalOverflow(page);
});

test('el calendario ofrece el modo correcto según el tamaño', async ({ page }) => {
  await loginAsAdmin(page);
  const width = page.viewportSize()?.width ?? 1280;
  const breakpoint = breakpointOf(width);

  if (breakpoint === 'mobile') {
    await expect(page.locator('[data-action="calendar:mode"][data-mode="agenda"]')).toHaveClass(
      /active/,
    );
    await expect(page.locator('[data-action="calendar:mode"][data-mode="month"]')).toBeHidden();
  } else if (breakpoint === 'tablet') {
    await expect(page.locator('[data-action="calendar:mode"][data-mode="week"]')).toHaveClass(
      /active/,
    );
    await expect(page.locator('.cal-week-col')).toHaveCount(7);
  } else {
    await expect(page.locator('[data-action="calendar:mode"][data-mode="month"]')).toHaveClass(
      /active/,
    );
    await expect(page.locator('.cal-day')).toHaveCount(42);
  }
});

test('Listings usa tarjetas en móvil en vez de la tabla', async ({ page }) => {
  await loginAsAdmin(page);
  await page.locator('[data-action="nav:go"][data-page="listings"]').click();
  const width = page.viewportSize()?.width ?? 1280;

  if (breakpointOf(width) === 'mobile') {
    await expect(page.locator('#listings-table-view')).toBeHidden();
    await expect(page.locator('#listings-grid')).toBeVisible();
  } else {
    await expect(page.locator('#listings-table-view')).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
});

test('en móvil los modales ocupan toda la pantalla', async ({ page }) => {
  await loginAsAdmin(page);
  const width = page.viewportSize()?.width ?? 1280;
  if (breakpointOf(width) !== 'mobile') return;

  await page.locator('[data-action="post:new"]').first().click();
  const modal = page.locator('#modal-post .modal');
  const box = await modal.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(width - 1);
});
