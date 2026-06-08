## What's broken

- **Desktop in-app top bar** (`src/pages/Index.tsx`, the `else` branch at line 172) only renders nav buttons in the top-right. There is no `BrandLogo` on the left, so signed-in desktop users never see the FMA mark. (Mobile/tablet already renders `<BrandLogo />` on the left; public landing already renders it too.)
- **Browser tab favicon** (`public/favicon.ico`), **iOS home-screen icon** (`public/apple-touch-icon.png`), and **PWA install icons** (`public/pwa-192x192.png`, `public/pwa-512x512.png`) are all the default Lovable heart artwork.
- **`public/manifest.webmanifest`** is referenced from `index.html` but the file does not exist, so PWA installs fall back to defaults.

## Changes

### 1. Add the FMA logo to the desktop in-app nav
File: `src/pages/Index.tsx`

In the desktop branch (currently `<div className="fixed top-4 right-4 ...">`), add a matching fixed top-left container that renders `<BrandLogo className="h-9 w-auto" />` wrapped in a button that resets the home view (same handler as the mobile version: clear selected episode + dispatch `homeReset`). Keep the existing right-side nav cluster untouched.

### 2. Replace the Lovable heart favicon / PWA icons with the FMA crisp-red icon
Source: `user-uploads://fma_app_icon_crisp_red_2048.png` (the dark-navy square with white FMA mark and red accent — works on light and dark browser chrome).

Generate from that single source and overwrite in `public/`:
- `favicon.ico` — multi-size ICO (16, 32, 48)
- `favicon-32.png`, `favicon-16.png` (added as `<link rel="icon">` entries)
- `apple-touch-icon.png` — 180×180
- `pwa-192x192.png` — 192×192
- `pwa-512x512.png` — 512×512 (also used as maskable; safe-area padding already inside the source)

Use ImageMagick via `nix run nixpkgs#imagemagick` to resize/convert from the uploaded PNG. No new repo binary beyond the public icons that already existed.

### 3. Create the missing PWA manifest
File: `public/manifest.webmanifest` (new)

```json
{
  "name": "Founder Mode Advice",
  "short_name": "FMA",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0f1420",
  "theme_color": "#0f1420",
  "icons": [
    { "src": "/pwa-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/pwa-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

This is manifest-only home-screen support per the PWA guidance — no service worker added.

### 4. Tighten favicon `<link>` tags in `index.html`
Add explicit PNG icon links alongside the existing ico/apple-touch/manifest references so browsers pick the crisp FMA mark at the right size:

```html
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
<link rel="icon" href="/favicon.ico" sizes="any" />
```

Keep all existing meta tags (theme-color, apple-mobile-web-app-*, og:*, twitter:*) as-is.

## Out of scope
- No service worker / offline behavior.
- No changes to the BrandLogo component itself — its light/dark swap already works correctly.
- No changes to the public landing nav (logo is already there).
