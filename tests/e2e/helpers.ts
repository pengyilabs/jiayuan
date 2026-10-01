import type { Page } from '@playwright/test';

/**
 * Tras iniciar sesión la interfaz adopta el idioma guardado en el perfil (chino en las cuentas
 * demo). Los E2E comprueban textos en inglés, así que se cambia el idioma de forma explícita.
 * Se usa `evaluate` porque el selector de idioma vive en el encabezado de Home, que está
 * oculto cuando se entra directamente por una URL como /approvals.
 */
export async function useEnglish(page: Page): Promise<void> {
  await page.locator('#lang-trigger').evaluate(el => {
    (el as HTMLElement).click();
  });
  await page.locator('[data-action="lang:select"][data-lang="en"]').evaluate(el => {
    (el as HTMLElement).click();
  });
}

/** Navega a una página del menú; en móvil el menú es un cajón, así que primero se abre. */
export async function goToPage(page: Page, name: string): Promise<void> {
  const menu = page.locator('.mobile-menu-btn:visible').first();
  if (await menu.count()) await menu.click();
  await page.locator(`[data-action="nav:go"][data-page="${name}"]`).click();
}
