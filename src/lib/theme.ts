/**
 * Theme defaults for next-themes.
 *
 * New users follow the OS appearance. A stored Light/Dark choice still
 * overrides. Status-bar sync watches the `dark` class, which next-themes
 * sets from prefers-color-scheme when the theme is `system`.
 */
export const THEME_DEFAULT = "system" as const;
export const THEME_ENABLE_SYSTEM = true;
