import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** True for failures loading a lazy chunk after a redeploy invalidated old hashed filenames. */
const isChunkLoadError = (error: Error) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed/i.test(
    `${error?.name ?? ""} ${error?.message ?? ""}`,
  );

const RELOAD_GUARD_KEY = "fma_chunk_reload_at";

/**
 * Last-resort boundary so a render crash or stale-chunk load failure shows a
 * branded recovery screen instead of a white page. Styled with plain inline
 * styles on purpose: if the crash came from the theme/CSS pipeline itself,
 * this screen still renders.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("AppErrorBoundary caught render error", error, info.componentStack);

    // A fresh deploy renames hashed chunks, so a long-lived tab can fail to
    // lazy-load a route. One automatic reload picks up the new build; the
    // sessionStorage guard prevents a reload loop if the failure persists.
    if (isChunkLoadError(error)) {
      const last = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
      if (Date.now() - last > 60_000) {
        sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        role="alert"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
          background: "#0c0e15",
          color: "#e7e9f0",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <p style={{ fontSize: "1.25rem", fontWeight: 600, margin: 0 }}>
          Something went wrong on our side.
        </p>
        <p style={{ fontSize: "0.9rem", color: "#9aa1b5", maxWidth: "26rem", margin: 0 }}>
          Your analyses and bookmarks are safe. Reload to pick up where you left off — if this
          keeps happening, email CA@saintmarlolabs.com.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: "8px",
            padding: "10px 28px",
            borderRadius: "9999px",
            border: "none",
            background: "#e7e9f0",
            color: "#0c0e15",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Reload app
        </button>
      </div>
    );
  }
}
