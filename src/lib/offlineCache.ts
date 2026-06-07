/**
 * IndexedDB-backed offline cache for Saved bookmarks + last viewed analysis.
 * Keeps the app useful when the device has no connectivity — required for
 * Apple App Review minimum-functionality (§4.2) when shipping via Despia.
 *
 * Storage is per-origin and per-device. No cross-device sync.
 */
import Dexie, { type Table } from "dexie";

export interface CachedBookmark {
  id: string;
  user_id: string;
  episode_id: string;
  folder_id: string | null;
  notes: string | null;
  episode_title: string | null;
  episode_founder_names: string | null;
  episode_release_date: string | null;
  episode_platform: string | null;
  cached_at: number;
}

export interface CachedAnalysis {
  episode_id: string;
  user_id: string;
  payload: unknown; // full episode + lessons + insights blob
  cached_at: number;
}

class OfflineDB extends Dexie {
  bookmarks!: Table<CachedBookmark, string>;
  analyses!: Table<CachedAnalysis, string>;

  constructor() {
    super("founder-mode-offline");
    this.version(1).stores({
      bookmarks: "id, user_id, episode_id, cached_at",
      analyses: "episode_id, user_id, cached_at",
    });
  }
}

let _db: OfflineDB | null = null;
function db(): OfflineDB {
  if (!_db) _db = new OfflineDB();
  return _db;
}

// ---------- Bookmarks ----------

export async function cacheSavedItems(
  userId: string,
  items: Array<Omit<CachedBookmark, "cached_at" | "user_id">>,
): Promise<void> {
  try {
    const rows: CachedBookmark[] = items.map((i) => ({
      ...i,
      user_id: userId,
      cached_at: Date.now(),
    }));
    await db().transaction("rw", db().bookmarks, async () => {
      await db().bookmarks.where("user_id").equals(userId).delete();
      if (rows.length) await db().bookmarks.bulkPut(rows);
    });
  } catch (err) {
    console.warn("offlineCache.cacheSavedItems failed", err);
  }
}

export async function getCachedSavedItems(userId: string): Promise<CachedBookmark[]> {
  try {
    return await db().bookmarks.where("user_id").equals(userId).toArray();
  } catch (err) {
    console.warn("offlineCache.getCachedSavedItems failed", err);
    return [];
  }
}

// ---------- Last analysis ----------

export async function cacheLastAnalysis(
  userId: string,
  episodeId: string,
  payload: unknown,
): Promise<void> {
  try {
    await db().analyses.put({
      episode_id: episodeId,
      user_id: userId,
      payload,
      cached_at: Date.now(),
    });
    // Keep only the 20 most recent per user to bound storage.
    const all = await db().analyses.where("user_id").equals(userId).sortBy("cached_at");
    if (all.length > 20) {
      const stale = all.slice(0, all.length - 20).map((a) => a.episode_id);
      await db().analyses.bulkDelete(stale);
    }
  } catch (err) {
    console.warn("offlineCache.cacheLastAnalysis failed", err);
  }
}

export async function getCachedAnalysis(episodeId: string): Promise<CachedAnalysis | null> {
  try {
    return (await db().analyses.get(episodeId)) ?? null;
  } catch (err) {
    console.warn("offlineCache.getCachedAnalysis failed", err);
    return null;
  }
}

// ---------- Maintenance ----------

export async function clearOfflineCache(): Promise<void> {
  try {
    await db().transaction("rw", db().bookmarks, db().analyses, async () => {
      await db().bookmarks.clear();
      await db().analyses.clear();
    });
  } catch (err) {
    console.warn("offlineCache.clearOfflineCache failed", err);
  }
}

export async function getCacheSize(): Promise<{ bookmarks: number; analyses: number }> {
  try {
    const [b, a] = await Promise.all([
      db().bookmarks.count(),
      db().analyses.count(),
    ]);
    return { bookmarks: b, analyses: a };
  } catch {
    return { bookmarks: 0, analyses: 0 };
  }
}
