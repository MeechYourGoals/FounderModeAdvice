import { mkdirSync } from 'node:fs';
import { test, type Page } from '@playwright/test';

/**
 * Raw App Store / Play Store screenshot source captures.
 *
 * Renders the app at true device LOGICAL sizes with the matching
 * deviceScaleFactor, so the app shows its real phone/tablet layout and the
 * output PNG lands exactly on Apple's required pixel dimensions:
 *
 *   iphone-6.9  → 1320 × 2868  (440×956 pt @3x  — 6.9" iPhone tier)
 *   ipad-13     → 2064 × 2752  (1032×1376 pt @2x — 13" iPad tier)
 *   android-phone → 1080 × 2400 (360×800 dp @3x)
 *
 * These are compositor inputs (see docs/app-store/SCREENSHOT_BRIEF.md), not
 * final store art — and they are honest captures of real screens, per App
 * Review rules. Authenticated screens need a seeded demo account:
 *   APP_SCREENSHOT_EMAIL / APP_SCREENSHOT_PASSWORD (see the brief for the
 *   demo-state runbook). ?source=app forces the installed-app experience
 *   (auth-first, bottom tab bar) so captures match what reviewers see.
 */

const BASE_URL = process.env.APP_SCREENSHOT_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:8080';
const SCREENSHOT_DIR = process.env.APP_SCREENSHOT_DIR || 'screenshots';
const DEMO_EMAIL = process.env.APP_SCREENSHOT_EMAIL;
const DEMO_PASSWORD = process.env.APP_SCREENSHOT_PASSWORD;

const DEVICES = [
  { name: 'iphone-6.9', width: 440, height: 956, scale: 3, mobile: true },
  { name: 'ipad-13', width: 1032, height: 1376, scale: 2, mobile: true },
  { name: 'android-phone', width: 360, height: 800, scale: 3, mobile: true },
];

/** Screens to capture. Authenticated ones run only when demo creds are set. */
const PUBLIC_SCREENS = [
  { name: '01-landing', path: '/' },
  { name: '02-auth', path: '/auth?source=app' },
];

const APP_SCREENS = [
  // Storyboard scenes (docs/app-store/SCREENSHOT_BRIEF.md). The demo account
  // must be pre-seeded with analyses so these screens show real content.
  { name: '03-home-and-library', path: '/?source=app' },
  { name: '04-favorites', path: '/favorites' },
  { name: '05-shared-with-me', path: '/shared' },
  { name: '06-account-subscription', path: '/account' },
  { name: '07-settings', path: '/settings' },
];

test.describe.configure({ mode: 'serial' });
test.setTimeout(180_000);

for (const device of DEVICES) {
  test(`store screenshots — ${device.name}`, async ({ browser }) => {
    mkdirSync(SCREENSHOT_DIR, { recursive: true });

    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
      isMobile: device.mobile,
      hasTouch: device.mobile,
    });
    const page = await context.newPage();

    const shoot = async (name: string, path: string) => {
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'domcontentloaded' });
      // 'networkidle' never settles when third-party hosts are unreachable
      // (analytics, fonts) — a fixed settle keeps captures deterministic.
      await page.waitForTimeout(2500);
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/${device.name}-${name}.png`,
        fullPage: false, // exact device frame, not a long scroll capture
      });
    };

    for (const screen of PUBLIC_SCREENS) {
      await shoot(screen.name, screen.path);
    }

    if (!DEMO_EMAIL || !DEMO_PASSWORD) {
      console.warn(
        `[${device.name}] Skipping authenticated screens — set APP_SCREENSHOT_EMAIL / APP_SCREENSHOT_PASSWORD.`,
      );
      await context.close();
      return;
    }

    await loginWithPassword(page);
    for (const screen of APP_SCREENS) {
      await shoot(screen.name, screen.path);
    }

    await context.close();
  });
}

async function loginWithPassword(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/auth?source=app`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  await page.getByRole('tab', { name: /sign in/i }).click().catch(() => undefined);
  await page.locator('input[type="email"]').fill(DEMO_EMAIL!);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD!);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 15000 });
  await page.waitForTimeout(1500);
}
