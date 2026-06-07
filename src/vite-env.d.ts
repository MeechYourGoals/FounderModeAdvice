/// <reference types="vite/client" />

interface Window {
  onRevenueCatPurchase?: () => void;
}


interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_SEED_PRICE_ID?: string;
  readonly VITE_STRIPE_SERIES_Z_PRICE_ID?: string;
  readonly VITE_APP_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
