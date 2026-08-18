#!/usr/bin/env node
/**
 * Capture raw App Store UI frames from the ScreenshotStudio route.
 */
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";
import path from "node:path";

const BASE_URL = process.env.APP_SCREENSHOT_BASE_URL || "http://127.0.0.1:8080";
const OUT_DIR = process.env.APP_SCREENSHOT_RAW_DIR || "app-store-assets/screenshots/raw";

const FRAMES = [
  "action",
  "operating-memo",
  "source-grounded",
  "lessons-risks-actions",
  "follow-up-qa",
  "library",
  "search",
  "save-share",
];

const DEVICES = [
  { key: "iphone", width: 1320, height: 2868, query: null },
  { key: "ipad", width: 2064, height: 2752, query: "device=ipad" },
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined,
    args: ["--disable-dev-shm-usage", "--font-render-hinting=none"],
  });

  try {
    for (const device of DEVICES) {
      for (const frame of FRAMES) {
        const context = await browser.newContext({
          viewport: { width: device.width, height: device.height },
          deviceScaleFactor: 1,
          colorScheme: "light",
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const qs = device.query ? `?${device.query}` : "";
        const url = `${BASE_URL}/__screenshots/${frame}${qs}`;
        console.log(`Capturing ${device.key} ${frame} @ ${device.width}x${device.height}`);
        await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
        await page.waitForSelector("[data-screenshot-root]", { timeout: 30000 });
        await page.evaluate(async () => {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
          // Hide toast chrome if present
          document.querySelectorAll("[data-sonner-toaster]").forEach((el) => {
            el.style.display = "none";
          });
          if (document.fonts?.ready) await document.fonts.ready;
        });
        await page.waitForTimeout(400);
        const out = path.join(OUT_DIR, `${frame}-${device.key}.png`);
        await page.screenshot({
          path: out,
          type: "png",
          fullPage: false,
          animations: "disabled",
        });
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Raw frames written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
