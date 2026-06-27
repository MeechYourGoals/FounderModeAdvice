import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createSupabaseClient } from "@foundermode/shared";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. " +
      "Copy apps/mobile/.env.example to apps/mobile/.env and fill them in.",
  );
}

/**
 * Native Supabase client: the session lives in AsyncStorage and is never parsed
 * from a URL — OAuth codes arrive through the `com.foundermodeadvice.app://` deep
 * link and are exchanged explicitly on the auth screen.
 */
export const supabase = createSupabaseClient({
  url,
  anonKey,
  storage: AsyncStorage,
  detectSessionInUrl: false,
});
