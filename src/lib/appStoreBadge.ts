/** Visible only on public marketing web. Hidden in the native/PWA shell. */
export function shouldShowAppStoreComingSoonBadge(opts: {
  nativeWrapper: boolean;
  standalonePwa: boolean;
}): boolean {
  return !opts.nativeWrapper && !opts.standalonePwa;
}

export const APP_STORE_COMING_SOON_LABEL = "Download on the App Store (coming soon)";
