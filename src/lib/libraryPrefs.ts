// Persisted defaults for the analyzed-episodes library (sort + view mode).
// Shared between the Settings screen and EpisodesTable so the two never drift.

export type LibrarySortColumn =
  | "created_at"
  | "release_date"
  | "title"
  | "company"
  | "founder"
  | "stage"
  | "industry"
  | "tag_count";
export type LibrarySortDirection = "asc" | "desc";
export type LibraryViewMode = "chronological" | "tag" | "folder";

export interface LibraryPrefs {
  sortColumn: LibrarySortColumn;
  sortDirection: LibrarySortDirection;
  viewMode: LibraryViewMode;
}

const KEY = "fma_library_prefs";

export const DEFAULT_LIBRARY_PREFS: LibraryPrefs = {
  sortColumn: "created_at",
  sortDirection: "desc",
  viewMode: "chronological",
};

export const SORT_LABELS: Record<LibrarySortColumn, string> = {
  created_at: "Date added",
  release_date: "Release date",
  title: "Title",
  company: "Company",
  founder: "Founder",
  stage: "Stage",
  industry: "Industry",
  tag_count: "Tag count",
};

export const VIEW_LABELS: Record<LibraryViewMode, string> = {
  chronological: "Chronological",
  tag: "By tag",
  folder: "By folder",
};

export function getLibraryPrefs(): LibraryPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_LIBRARY_PREFS;
    return { ...DEFAULT_LIBRARY_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LIBRARY_PREFS;
  }
}

export function setLibraryPrefs(prefs: Partial<LibraryPrefs>): LibraryPrefs {
  const next = { ...getLibraryPrefs(), ...prefs };
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore write failures (private mode, etc.)
  }
  return next;
}
