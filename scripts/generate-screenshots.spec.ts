import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';

const BASE_URL = process.env.APP_SCREENSHOT_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = process.env.APP_SCREENSHOT_DIR || 'screenshots';
const DEMO_EMAIL = process.env.APP_SCREENSHOT_EMAIL;
const DEMO_PASSWORD = process.env.APP_SCREENSHOT_PASSWORD;

// App Store / Play Store representative device sizes.
const DEVICES = [
  { name: 'iphone-6.9', width: 1320, height: 2868 },
  { name: 'ipad-13', width: 2064, height: 2752 },
];

async function captureScreenshots(page: Page, name: string) {
  mkdirSync(SCREENSHOT_DIR, { recursive: true });

  for (const device of DEVICES) {
    await page.setViewportSize({ width: device.width, height: device.height });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/${device.name}-${name}.png`,
      fullPage: true,
    });
  }
}

async function loginIfConfigured(page: Page): Promise<boolean> {
  if (!DEMO_EMAIL || !DEMO_PASSWORD) return false;

  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: /sign in/i }).click().catch(() => undefined);
  await page.locator('input[type="email"]').fill(DEMO_EMAIL);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  return true;
}

test('generate store screenshots', async ({ page }) => {
  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await captureScreenshots(page, '01-landing');

  await page.goto(`${BASE_URL}/auth`);
  await page.waitForLoadState('networkidle');
  await captureScreenshots(page, '02-auth');

  const isAuthenticated = await loginIfConfigured(page);
  if (!isAuthenticated) {
    console.warn('Skipping authenticated screenshots. Set APP_SCREENSHOT_EMAIL and APP_SCREENSHOT_PASSWORD to capture app screens.');
    return;
  }

  await page.goto(BASE_URL);
  await page.waitForLoadState('networkidle');
  await captureScreenshots(page, '03-dashboard');

  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState('networkidle');
  await captureScreenshots(page, '04-settings');

  await page.goto(`${BASE_URL}/account`);
  await page.waitForLoadState('networkidle');
  await captureScreenshots(page, '05-account-subscription');
});
