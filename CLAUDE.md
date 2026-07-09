# CLAUDE.md

Project guidance for Claude Code.

## Codex CLI as a sub-agent

The user wants the OpenAI **Codex CLI** available as a sub-agent, invoked on demand.

**Trigger:** whenever the user says *"use codex"* (or "ask codex", "have codex …"),
delegate that task to the codex CLI as a sub-agent and relay its result — do not
do the task yourself unless codex is unavailable.

**How to invoke** (non-interactive `exec` mode):

```bash
# Ensure codex is present first (installs on a fresh/ephemeral machine):
command -v codex >/dev/null || bash scripts/setup-codex.sh

# Delegate the task. Model + settings come from ~/.codex/config.toml.
codex exec -C "$PWD" "<the task the user asked codex to do>"

# One-off model override for a single call:
codex exec -m gpt-5.6-terra -C "$PWD" "<task>"
```

Use `codex exec review` for code review, or `codex exec resume --last` to continue
codex's previous session.

**Default model:** `gpt-5.6-sol` ("GPT 5.6 Sol"), alternate `gpt-5.6-terra` ("Terra").
Configured in `~/.codex/config.toml` (`model = "…"`). These slugs are best-guess
mappings of the product names; if codex reports an unknown model, correct that one
line to the exact id OpenAI expects.

**Prerequisites for codex to actually run** (both are environment-level, outside the repo):

1. **Auth** — codex needs OpenAI credentials. Either
   `printenv OPENAI_API_KEY | codex login --with-api-key`, or interactive `codex login`.
2. **Network** — codex must reach `api.openai.com`. Sandboxes with a restrictive
   network policy block it and codex fails with `HTTP CONNECT 403`. Use an
   environment whose network policy allows OpenAI, or run codex where it has egress.

Setup / reinstall: `bash scripts/setup-codex.sh` (idempotent).
