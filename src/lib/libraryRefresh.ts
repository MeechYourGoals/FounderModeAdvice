const REQUEST = "libraryRefresh";
const DONE = "libraryRefreshDone";

/**
 * Ask the playbook list to refetch, and resolve when it signals done.
 * Pull-to-refresh holds until this settles (same contract as Discover).
 */
export function requestLibraryRefreshFrom(
  target: EventTarget,
  timeoutMs = 15_000,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      target.removeEventListener(DONE, finish);
      resolve();
    };
    target.addEventListener(DONE, finish);
    target.dispatchEvent(new Event(REQUEST));
    setTimeout(finish, timeoutMs);
  });
}

export function requestLibraryRefresh(): Promise<void> {
  return requestLibraryRefreshFrom(window);
}

export function signalLibraryRefreshDone(target: EventTarget = window): void {
  target.dispatchEvent(new Event(DONE));
}
