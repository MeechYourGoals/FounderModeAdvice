# @foundermode/mobile

The Expo (React Native) app for Founder Mode Advice — ships to iOS/Android via
**Expo Go + EAS Build/Submit**. Shares logic with the web app through
`@foundermode/shared`.

Quick start:

```bash
cp .env.example .env     # EXPO_PUBLIC_SUPABASE_URL + _ANON_KEY
npm install
npx expo install --fix
npx expo start
```

Full setup, EAS Build/Submit, Supabase config, and the done/follow-up list live in
**`docs/expo-monorepo.md`** at the repo root.

- `app/` — Expo Router routes. `index.tsx` is the auth-first entry (login or app
  shell, never marketing); `auth.tsx` is login; `(app)/` is the authed area.
- `src/auth/AuthProvider.tsx` — one session listener for the tree.
- `src/lib/supabase.ts` — native Supabase client (AsyncStorage, PKCE deep link).
