# App Store Launch Runbook

## Assets needed

### iOS (App Store Connect)
- App icon 1024×1024 PNG (no alpha, no rounded corners) — `app-store-assets/icon-1024.png`
- iPhone 6.9" screenshots (1320×2868) — 3–10 images
- iPhone 6.5" screenshots (1284×2778) — optional fallback
- iPad 13" screenshots (2064×2752) — if iPad supported

### Android (Play Console)
- High-res icon 512×512 PNG with alpha — `public/pwa-512x512.png`
- Feature graphic 1024×500 JPG/PNG (no alpha)
- Phone screenshots 1080×1920 to 1440×2560 — 2–8 images
- 7" tablet screenshots 1080×1920 — optional
- 10" tablet screenshots 1800×2560 — optional

## Capture screenshots from the live app

1. Open https://foundermodeadvice.com in Chrome
2. DevTools → Toggle device toolbar → iPhone 15 Pro Max (430×932)
3. Sign in with a demo account
4. Capture these flows:
   - Library (with 2–3 analyzed videos)
   - Insights view (general + tailored side by side)
   - Profile picker with multiple businesses
   - Ask-the-video chat
   - Bookmark/folder view
5. Use DevTools Capture full size screenshot for each
6. Resize/crop to required dimensions

## Build & submit

### iOS
```bash
git pull
npm install
npx cap update ios
npm run build
npx cap sync ios
npx cap open ios
# In Xcode: Archive → Distribute → App Store Connect
```

### Android
```bash
git pull
npm install
npx cap update android
npm run build
npx cap sync android
npx cap open android
# In Android Studio: Build → Generate Signed Bundle → AAB → upload to Play Console
```

## Pre-launch checklist
- [ ] Privacy policy live at /privacy
- [ ] Terms of service live at /terms
- [ ] All "vibe-coding" sparkle/lightning glyphs removed
- [ ] FMA logo confirmed in nav across authenticated pages
- [ ] PWA install on iOS shows red FMA mark
- [ ] PWA install on Android shows red FMA mark
- [ ] Free-tier flow works without payment method
- [ ] Stripe paid flow tested end-to-end
- [ ] RevenueCat in-app purchase tested on TestFlight
- [ ] All screenshots use real branding (no Lovable badge)
