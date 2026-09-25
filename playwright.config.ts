import { defineConfig, devices } from '@playwright/test';

/** `PW_CHROMIUM_PATH` permite usar un Chromium ya instalado en lugar del descargado por Playwright. */
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
      },
    },
    {
      // Tablet (640–1023px, F7): mismo motor que "desktop", solo cambia el viewport. Solo
      // corre `responsive.spec.ts`: el resto de specs se escribió pensando en escritorio.
      name: 'tablet',
      testMatch: /(responsive|a11y)\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 800, height: 1024 },
        launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
      },
    },
    {
      // Móvil (<640px, F7): viewport táctil real (iPhone 13, 390×844).
      name: 'mobile',
      testMatch: /(responsive|a11y)\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        launchOptions: executablePath ? { executablePath, args: ['--no-sandbox'] } : {},
      },
    },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
