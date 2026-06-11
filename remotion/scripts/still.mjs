import { bundle } from "@remotion/bundler";
import { renderStill, openBrowser } from "@remotion/renderer";
import { selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const frame = parseInt(process.argv[2] ?? "240", 10);
const out = process.argv[3] ?? `/tmp/check${frame}.png`;

const bundled = await bundle({ entryPoint: path.resolve(__dirname, "../src/index.ts"), webpackOverride: (c) => c });

const browser = await openBrowser("chrome", {
  browserExecutable: "/bin/chromium",
  chromiumOptions: { args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"] },
  chromeMode: "chrome-for-testing",
});

const composition = await selectComposition({ serveUrl: bundled, id: "demo", puppeteerInstance: browser });
await renderStill({ composition, serveUrl: bundled, frame, output: out, puppeteerInstance: browser });
await browser.close({ silent: false });
console.log("wrote", out);
