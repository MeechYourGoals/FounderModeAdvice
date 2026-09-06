import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const pkg = JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf-8"));

// Stable per-build identifier injected into index.html so a post-deploy script
// can verify the live preview is serving the freshly built shell (not a stale
// service-worker cached copy) without any manual SW unregister.
const BUILD_ID = `${pkg.version}-${Date.now().toString(36)}`;

function buildIdPlugin(): Plugin {
  return {
    name: "fma-build-id",
    transformIndexHtml(html) {
      return html.replace(
        "</head>",
        `  <meta name="build-id" content="${BUILD_ID}" />\n  </head>`,
      );
    },
    closeBundle() {
      try {
        mkdirSync(path.resolve(__dirname, "dist"), { recursive: true });
        writeFileSync(
          path.resolve(__dirname, "dist/build-id.txt"),
          BUILD_ID + "\n",
          "utf-8",
        );
      } catch {
        // dist may not exist during non-build commands; safe to ignore
      }
    },
  };
}

/** Serve AASA as JSON and stamp the Apple Team ID when VITE_APPLE_TEAM_ID is set. */
function appleAppSiteAssociationPlugin(): Plugin {
  const teamId = process.env.VITE_APPLE_TEAM_ID?.trim();
  const stamp = (filePath: string) => {
    if (!teamId) return;
    try {
      const current = readFileSync(filePath, "utf-8");
      writeFileSync(filePath, current.replaceAll("TEAMID", teamId), "utf-8");
    } catch {
      // file may not exist yet
    }
  };
  return {
    name: "fma-aasa",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split("?")[0] === "/.well-known/apple-app-site-association") {
          res.setHeader("Content-Type", "application/json");
        }
        next();
      });
    },
    closeBundle() {
      stamp(path.resolve(__dirname, "dist/.well-known/apple-app-site-association"));
    },
  };
}

// Public (publishable) backend identifiers for the connected project. These are
// browser-visible by design and protected by RLS — never put secret/service keys
// here. They act only as a fallback so a hosted build without a local .env file
// still resolves the same connected backend.
const FALLBACK_SUPABASE_PROJECT_ID = "iffcuueutmsusgdfekvm";
const FALLBACK_SUPABASE_URL = `https://${FALLBACK_SUPABASE_PROJECT_ID}.supabase.co`;
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlmZmN1dWV1dG1zdXNnZGZla3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk4NzIzMjAsImV4cCI6MjA3NTQ0ODMyMH0.4WotR4GhYL21TZ2VgxyWh1mAoAadKKwAqMIbxekhhy0";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const supabaseUrl = env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  const supabaseKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY;
  const supabaseProjectId =
    env.VITE_SUPABASE_PROJECT_ID || FALLBACK_SUPABASE_PROJECT_ID;

  return {
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabaseKey),
    "import.meta.env.VITE_SUPABASE_PROJECT_ID": JSON.stringify(supabaseProjectId),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    buildIdPlugin(),
    mcpPlugin(),
    appleAppSiteAssociationPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png"],
      // Single source of truth is public/manifest.webmanifest (richer: app id,
      // shortcuts, lang). Generating a second manifest here collided with it on
      // the same output filename with divergent contents (orientation,
      // start_url, categories), so whichever won was nondeterministic.
      manifest: false,
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        // The social-preview image is only fetched by link scrapers — don't
        // make every PWA install download ~0.9 MB it will never render.
        globIgnores: ["**/og-image.png"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/, /^\/\.well-known/],
        // Do not runtime-cache Supabase REST/Auth/Functions/Storage responses here.
        // Authenticated offline data is intentionally scoped in src/lib/offlineCache.ts
        // so one user cannot see another user's cached API responses after sign-out.
        cleanupOutdatedCaches: true,
        // Take control immediately so new deploys are visible on next navigation,
        // not after the user closes every tab. Prevents stale-preview confusion.
        skipWaiting: true,
        clientsClaim: true,
        // Always revalidate index.html from network so newly deployed builds
        // (with updated asset hashes) appear without a hard refresh.
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "html-pages",
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
          // Runtime-hosted brand assets (logo PNGs) are same-origin but not
          // in the build output, so precache misses them. Cache-first keeps
          // the brand mark rendering offline and on flaky connections.
          {
            urlPattern: /\/__l5e\/assets-v1\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "brand-assets",
              expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  };
});
