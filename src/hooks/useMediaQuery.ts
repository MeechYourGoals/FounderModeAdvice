import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const listener = () => setMatches(media.matches);
    media.addEventListener("change", listener);

    // Initial check in case the query changed but matches state didn't update yet
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    return () => media.removeEventListener("change", listener);
    // matches is omitted to avoid re-attaching listener on every match change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return matches;
}
