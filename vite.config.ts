import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
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

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    buildIdPlugin(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "pwa-192x192.png"],
      manifest: {
        name: "Founder Mode Advice",
        short_name: "Founder Mode",
        description: "Turn business, founder, and leadership videos into personalized advice for your company, industry, and stage.",
        theme_color: "#0f1420",
        background_color: "#0f1420",
        display: "standalone",
        display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
        orientation: "any",
        scope: "/",
        start_url: "/",
        categories: ["productivity", "education"],
        prefer_related_applications: false,
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,ico,png,svg,jpg,jpeg,webp,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/~oauth/],
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
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
